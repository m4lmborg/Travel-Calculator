// DOM Elements
const generateTableBtn = document.getElementById('generate-table');
const calculateBtn = document.getElementById('calculate');
const selectAllBtn = document.getElementById('select-all');
const clearAllBtn = document.getElementById('clear-all');
const shareResultsBtn = document.getElementById('share-results');
const downloadPdfBtn = document.getElementById('download-pdf');

const tripNameInput = document.getElementById('trip-name');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const nightsInput = document.getElementById('nights');
const peopleInput = document.getElementById('people');
const totalCostInput = document.getElementById('total-cost');
const attendanceTable = document.getElementById('attendance-table');
const resultsSection = document.querySelector('.results-section');
const attendanceSection = document.querySelector('.attendance-section');
const resultsList = document.getElementById('results-list');
const namesContainer = document.querySelector('.names-container');

const percentageInputs = document.getElementById('percentage-inputs');
const percentagesContainer = document.querySelector('.percentages-container');
const weightedInputs = document.getElementById('weighted-inputs');
const fixedCostsInput = document.getElementById('fixed-costs');
const nightlyCostsInput = document.getElementById('nightly-costs');

let chart = null;
let participantNames = [];

// Event Listeners
generateTableBtn.addEventListener('click', generateAttendanceTable);
selectAllBtn.addEventListener('click', selectAllNights);
clearAllBtn.addEventListener('click', clearAllNights);
shareResultsBtn.addEventListener('click', shareResults);
downloadPdfBtn.addEventListener('click', downloadPdf);
peopleInput.addEventListener('change', updateNameInputs);
totalCostInput.addEventListener('input', handleTotalCostChange);

// Input Validation
[nightsInput, peopleInput, totalCostInput].forEach(input => {
    input.addEventListener('input', validateInput);
});

function validateInput(e) {
    const input = e.target;
    const value = parseFloat(input.value);
    
    if (value < input.min) {
        input.value = input.min;
    }
    
    if (input === peopleInput) {
        updateNameInputs();
    }
    
    // Recalculate based on current method when inputs change
    const currentMethod = document.querySelector('input[name="calc-method"]:checked').value;
    handleCalculationMethodChange(currentMethod);
}

// Handle total cost changes
function handleTotalCostChange() {
    const currentMethod = document.querySelector('input[name="calc-method"]:checked').value;
    handleCalculationMethodChange(currentMethod);
}

// Event Listeners for calculation method changes
document.querySelectorAll('input[name="calc-method"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        // Update selected styles
        document.querySelectorAll('.radio-container').forEach(container => {
            container.classList.remove('selected');
        });
        e.target.closest('.radio-container').classList.add('selected');
        
        // Show/hide sections based on calculation method
        handleCalculationMethodChange(e.target.value);
    });
});

// Handle display changes based on calculation method
function handleCalculationMethodChange(method) {
    // Hide all optional sections first
    percentageInputs.classList.add('hidden');
    weightedInputs.classList.add('hidden');
    attendanceSection.classList.add('hidden');
    
    // Reset results
    resultsSection.classList.add('hidden');
    
    // Validate required inputs
    const totalCost = parseFloat(totalCostInput.value);
    const people = parseInt(peopleInput.value);
    
    if (!totalCost || !people) {
        return; // Don't proceed if basic inputs are missing
    }
    
    switch(method) {
        case 'equal':
            calculateEqualSplit();
            break;
            
        case 'nightly':
            attendanceSection.classList.remove('hidden');
            generateAttendanceTable();
            break;
            
        case 'weighted':
            weightedInputs.classList.remove('hidden');
            attendanceSection.classList.remove('hidden');
            generateAttendanceTable();
            updateWeightedInputs();
            break;
            
        case 'percentage':
            percentageInputs.classList.remove('hidden');
            updatePercentageInputs();
            break;
    }
}

// Calculate equal split immediately
function calculateEqualSplit() {
    const totalCost = parseFloat(totalCostInput.value);
    const people = parseInt(peopleInput.value);
    
    if (!totalCost || !people) {
        showError('Please enter valid total cost and number of people');
        return;
    }
    
    const equalShare = totalCost / people;
    const shares = Array(people).fill(equalShare);
    displayResults(shares);
}

// Calculate nightly split
function calculateNightlySplit() {
    const totalCost = parseFloat(totalCostInput.value);
    if (!totalCost) {
        showError('Please enter a valid total cost');
        return;
    }
    
    const attendance = getAttendanceData();
    const totalNights = attendance.reduce((sum, person) => 
        sum + person.filter(night => night).length, 0);
    
    if (totalNights === 0) {
        showError('Please select at least one night in the attendance table');
        return;
    }
    
    const costPerNight = totalCost / totalNights;
    const shares = attendance.map(person => 
        person.filter(night => night).length * costPerNight);
    
    displayResults(shares);
}

// Calculate weighted split
function calculateWeightedSplit() {
    const totalCost = parseFloat(totalCostInput.value);
    const fixedCosts = parseFloat(fixedCostsInput.value) || 0;
    const nightlyCost = parseFloat(nightlyCostsInput.value) || 0;
    const people = parseInt(peopleInput.value);
    const nights = parseInt(nightsInput.value);
    
    if (!totalCost || !people || !nights) {
        showError('Please enter valid total cost, number of people, and nights');
        return;
    }
    
    const attendance = getAttendanceData();
    const totalPersonNights = attendance.reduce((sum, person) => 
        sum + person.filter(night => night).length, 0);
    
    if (totalPersonNights === 0) {
        showError('Please select at least one night in the attendance table');
        return;
    }
    
    // Each person's share of fixed costs
    const fixedShare = fixedCosts / people;
    
    // Cost per night per person
    const costPerNight = nightlyCost;
    
    const shares = attendance.map(person => {
        const nightsStayed = person.filter(night => night).length;
        return fixedShare + (nightsStayed * costPerNight);
    });
    
    displayResults(shares);
}

// Get attendance data from table
function getAttendanceData() {
    const people = parseInt(peopleInput.value);
    const attendance = [];
    
    for (let i = 0; i < people; i++) {
        const personNights = [];
        const cells = attendanceTable.querySelectorAll(`tr:nth-child(${i + 2}) td.night-cell`);
        cells.forEach(cell => {
            personNights.push(cell.classList.contains('selected'));
        });
        attendance.push(personNights);
    }
    
    return attendance;
}

// Update percentage inputs
function updatePercentageInputs() {
    const numPeople = parseInt(peopleInput.value) || 0;
    percentagesContainer.innerHTML = '';
    
    // Track which inputs have been manually edited
    const editedInputs = new Set();
    
    // Initialize with equal split
    const defaultPercentage = Math.floor(100 / numPeople);
    let remainingPercentage = 100 - (defaultPercentage * (numPeople - 1));
    
    for (let i = 0; i < numPeople; i++) {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'percentage-input-group';
        
        const label = document.createElement('label');
        label.textContent = participantNames[i] || `Person ${i + 1}`;
        
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.max = '100';
        input.step = '1';
        input.value = i === numPeople - 1 ? remainingPercentage : defaultPercentage;
        input.dataset.personIndex = i;
        
        input.addEventListener('input', (e) => {
            // Mark this input as edited
            editedInputs.add(parseInt(e.target.dataset.personIndex));
            
            // Ensure value is a whole number
            let value = Math.floor(Number(e.target.value));
            if (value < 0) value = 0;
            if (value > 100) value = 100;
            
            // Get all percentage inputs
            const allInputs = Array.from(percentagesContainer.querySelectorAll('input'));
            
            // Calculate total of edited inputs (excluding current)
            const editedTotal = allInputs
                .filter((inp, idx) => editedInputs.has(idx) && inp !== e.target)
                .reduce((sum, inp) => sum + (parseInt(inp.value) || 0), 0);
            
            // If new value would make total exceed 100%, adjust it
            if (value + editedTotal > 100) {
                value = 100 - editedTotal;
            }
            
            // Update current input value
            e.target.value = value;
            
            // Calculate remaining percentage for unedited inputs
            const totalEdited = value + editedTotal;
            const remaining = 100 - totalEdited;
            
            // Get unedited inputs
            const uneditedInputs = allInputs.filter((inp, idx) => !editedInputs.has(idx) && inp !== e.target);
            
            if (uneditedInputs.length > 0) {
                // Distribute remaining percentage equally among unedited inputs
                const eachUnedited = Math.floor(remaining / uneditedInputs.length);
                let remainderUnedited = remaining - (eachUnedited * uneditedInputs.length);
                
                uneditedInputs.forEach((inp, idx) => {
                    // Add one to the first inputs if there's a remainder
                    inp.value = eachUnedited + (idx < remainderUnedited ? 1 : 0);
                });
            }
            
            if (updatePercentageTotal()) {
                calculatePercentageSplit();
            }
        });
        
        const percentSymbol = document.createElement('span');
        percentSymbol.textContent = '%';
        percentSymbol.className = 'percent-symbol';
        
        inputGroup.appendChild(label);
        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'percentage-input-wrapper';
        inputWrapper.appendChild(input);
        inputWrapper.appendChild(percentSymbol);
        inputGroup.appendChild(inputWrapper);
        
        percentagesContainer.appendChild(inputGroup);
    }
    
    updatePercentageTotal();
    calculatePercentageSplit();
}

// Update weighted inputs
function updateWeightedInputs() {
    const totalCost = parseFloat(totalCostInput.value) || 0;
    const nights = parseInt(nightsInput.value) || 0;
    const nightlyCost = parseFloat(nightlyCostsInput.value) || 0;
    
    // Calculate fixed costs based on total cost and nightly costs
    const totalNightlyCosts = nightlyCost * nights;
    const fixedCosts = totalCost - totalNightlyCosts;
    
    // Update input values
    fixedCostsInput.value = Math.max(0, fixedCosts).toFixed(2);
    nightlyCostsInput.value = nightlyCost.toFixed(2);
    
    // Add listeners to maintain total
    [fixedCostsInput, nightlyCostsInput].forEach(input => {
        input.addEventListener('input', () => {
            if (input === nightlyCostsInput) {
                // When nightly cost changes, recalculate fixed costs
                const newNightlyCost = parseFloat(nightlyCostsInput.value) || 0;
                const totalNightlyCosts = newNightlyCost * nights;
                fixedCostsInput.value = Math.max(0, totalCost - totalNightlyCosts).toFixed(2);
            } else {
                // When fixed costs change, recalculate nightly costs
                const newFixedCosts = parseFloat(fixedCostsInput.value) || 0;
                const remainingForNights = totalCost - newFixedCosts;
                nightlyCostsInput.value = Math.max(0, remainingForNights / nights).toFixed(2);
            }
            calculateWeightedSplit();
        });
    });
}

// Calculate percentage split
function calculatePercentageSplit() {
    const totalCost = parseFloat(totalCostInput.value);
    if (!totalCost) {
        showError('Please enter a valid total cost');
        return;
    }
    
    if (!updatePercentageTotal()) {
        return; // Don't calculate if percentages don't add up to 100
    }
    
    const percentages = Array.from(percentagesContainer.querySelectorAll('input'))
        .map(input => parseInt(input.value) || 0);
    
    const shares = percentages.map(percentage => totalCost * (percentage / 100));
    displayResults(shares);
}

// Update percentage total and validate
function updatePercentageTotal() {
    const inputs = percentagesContainer.querySelectorAll('input');
    const total = Array.from(inputs).reduce((sum, input) => sum + (parseInt(input.value) || 0), 0);
    
    const totalElement = document.querySelector('.percentage-total span');
    totalElement.textContent = total;
    
    const isValid = total === 100;
    document.querySelector('.percentage-total').classList.toggle('invalid', !isValid);
    
    return isValid;
}

// Display Results
function displayResults(shares) {
    resultsList.innerHTML = '';
    const totalCost = parseFloat(totalCostInput.value);
    const tripName = tripNameInput.value || 'Trip';
    
    // Add trip name to results
    const tripNameDiv = document.createElement('div');
    tripNameDiv.className = 'trip-name-display';
    tripNameDiv.innerHTML = `<h3>${tripName}</h3>`;
    resultsList.appendChild(tripNameDiv);
    
    shares.forEach((share, index) => {
        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
            <p>${participantNames[index]}: $${share.toFixed(2)}</p>
        `;
        resultsList.appendChild(div);
    });
    
    document.getElementById('total-cost-display').textContent = `$${totalCost.toFixed(2)}`;
    
    // Create/Update chart
    updateChart(shares);
    
    resultsSection.classList.remove('hidden');
}

// Update Chart
function updateChart(shares) {
    const ctx = document.querySelector('#share-chart').getContext('2d');
    
    if (chart) {
        chart.destroy();
    }
    
    chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: participantNames,
            datasets: [{
                data: shares,
                backgroundColor: [
                    '#2563eb',
                    '#7c3aed',
                    '#db2777',
                    '#dc2626',
                    '#ea580c',
                    '#d97706',
                    '#65a30d',
                    '#059669'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                title: {
                    display: true,
                    text: tripNameInput.value || 'Trip Expenses',
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
}

// Initialize dates when page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeDates();
    // Select equal split by default and calculate
    const equalSplitRadio = document.querySelector('input[value="equal"]');
    if (equalSplitRadio) {
        equalSplitRadio.checked = true;
        handleCalculationMethodChange('equal');
    }
});

// Update name input fields when number of people changes
function updateNameInputs() {
    const numPeople = parseInt(peopleInput.value) || 0;
    namesContainer.innerHTML = '';
    participantNames = [];

    for (let i = 0; i < numPeople; i++) {
        const nameGroup = document.createElement('div');
        nameGroup.className = 'name-input-group';
        
        const personNumber = document.createElement('span');
        personNumber.className = 'person-number';
        personNumber.textContent = `#${i + 1}`;
        
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = `Person ${i + 1}'s name`;
        nameInput.dataset.personIndex = i;
        nameInput.addEventListener('input', (e) => {
            participantNames[i] = e.target.value.trim() || `Person ${i + 1}`;
        });
        
        nameGroup.appendChild(personNumber);
        nameGroup.appendChild(nameInput);
        namesContainer.appendChild(nameGroup);
        
        participantNames[i] = `Person ${i + 1}`;
    }
}

// Initialize dates
function initializeDates() {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + 7); // Set end date to 7 days from today
    
    // Format dates for input fields (YYYY-MM-DD)
    startDateInput.value = formatDate(today);
    endDateInput.value = formatDate(endDate);
    
    // Set min dates to prevent selecting past dates
    startDateInput.min = formatDate(today);
    
    updateNights();
}

// Format date as YYYY-MM-DD
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// Calculate nights between dates
function updateNights() {
    const startDate = new Date(startDateInput.value);
    const endDate = new Date(endDateInput.value);
    
    // Calculate the difference in days
    const timeDiff = endDate.getTime() - startDate.getTime();
    const nightsDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    // Update nights input
    nightsInput.value = Math.max(1, nightsDiff);
    
    // If attendance table exists, regenerate it
    if (attendanceTable.innerHTML !== '') {
        generateAttendanceTable();
    }
}

// Event Listeners for dates
startDateInput.addEventListener('change', function() {
    // Ensure end date is not before start date
    if (endDateInput.value < startDateInput.value) {
        endDateInput.value = startDateInput.value;
    }
    endDateInput.min = startDateInput.value;
    updateNights();
});

endDateInput.addEventListener('change', function() {
    // Ensure start date is not after end date
    if (startDateInput.value > endDateInput.value) {
        startDateInput.value = endDateInput.value;
    }
    updateNights();
});

// Generate Attendance Table
function generateAttendanceTable() {
    const nights = parseInt(nightsInput.value);
    const people = parseInt(peopleInput.value);
    
    if (!nights || !people) {
        showError('Please enter valid numbers for nights and people');
        return;
    }

    // Clear existing table
    attendanceTable.innerHTML = '';
    
    // Create header row with dates
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th>Name</th>';
    
    // Add date headers
    const startDate = new Date(startDateInput.value);
    for (let i = 0; i < nights; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const formattedDate = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            weekday: 'short'
        });
        headerRow.innerHTML += `<th>${formattedDate}</th>`;
    }
    attendanceTable.appendChild(headerRow);
    
    // Create rows for each person
    for (let i = 0; i < people; i++) {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${participantNames[i]}</td>` + 
            Array.from({length: nights}, () => '<td class="night-cell"></td>').join('');
        attendanceTable.appendChild(row);
    }
    
    // Add click handlers to night cells
    const nightCells = document.querySelectorAll('.night-cell');
    nightCells.forEach(cell => {
        cell.addEventListener('click', function() {
            this.classList.toggle('selected');
            
            // Recalculate based on current method
            const currentMethod = document.querySelector('input[name="calc-method"]:checked').value;
            if (currentMethod === 'nightly') {
                calculateNightlySplit();
            } else if (currentMethod === 'weighted') {
                calculateWeightedSplit();
            }
        });
    });
    
    // Show attendance section
    attendanceSection.classList.remove('hidden');
}

// Utility Functions
function selectAllNights() {
    const cells = document.querySelectorAll('.night-cell');
    cells.forEach(cell => cell.classList.add('selected'));
    
    // Recalculate based on current method
    const currentMethod = document.querySelector('input[name="calc-method"]:checked').value;
    if (currentMethod === 'nightly') {
        calculateNightlySplit();
    } else if (currentMethod === 'weighted') {
        calculateWeightedSplit();
    }
}

function clearAllNights() {
    const cells = document.querySelectorAll('.night-cell');
    cells.forEach(cell => cell.classList.remove('selected'));
    
    // Hide results when all nights are cleared
    resultsSection.classList.add('hidden');
}

function shareResults() {
    // Implementation for sharing results (could be integrated with a sharing API)
    alert('Sharing functionality will be implemented soon!');
}

function downloadPdf() {
    const tripName = tripNameInput.value || 'Trip';
    const totalCost = parseFloat(totalCostInput.value);
    const shares = [];
    
    // Get current calculation method
    const currentMethod = document.querySelector('input[name="calc-method"]:checked').value;
    
    // Get shares based on calculation method
    if (currentMethod === 'equal') {
        const equalShare = totalCost / participantNames.length;
        participantNames.forEach(name => {
            shares.push({ name, share: equalShare });
        });
    } else if (currentMethod === 'percentage') {
        const percentages = Array.from(percentagesContainer.querySelectorAll('input'))
            .map(input => parseInt(input.value) || 0);
        participantNames.forEach((name, index) => {
            const share = totalCost * (percentages[index] / 100);
            shares.push({ name, share });
        });
    } else {
        // For nightly and weighted methods, get from attendance
        const attendance = getAttendanceData();
        if (currentMethod === 'nightly') {
            const totalNights = attendance.reduce((sum, person) => 
                sum + person.filter(night => night).length, 0);
            const costPerNight = totalCost / totalNights;
            
            participantNames.forEach((name, index) => {
                const nightsStayed = attendance[index].filter(night => night).length;
                const share = nightsStayed * costPerNight;
                shares.push({ name, share });
            });
        } else if (currentMethod === 'weighted') {
            const fixedCosts = parseFloat(fixedCostsInput.value) || 0;
            const nightlyCosts = parseFloat(nightlyCostsInput.value) || 0;
            const fixedShare = fixedCosts / participantNames.length;
            
            const totalPersonNights = attendance.reduce((sum, person) => 
                sum + person.filter(night => night).length, 0);
            const costPerPersonNight = nightlyCosts / totalPersonNights;
            
            participantNames.forEach((name, index) => {
                const nightsStayed = attendance[index].filter(night => night).length;
                const share = fixedShare + (nightsStayed * costPerPersonNight);
                shares.push({ name, share });
            });
        }
    }
    
    // Create PDF content (using window.print() for now)
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>${tripName} - Expense Summary</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #2563eb; }
                    .summary { margin: 20px 0; }
                    .share-item { margin: 10px 0; }
                </style>
            </head>
            <body>
                <h1>${tripName}</h1>
                <div class="summary">
                    <p><strong>Total Cost:</strong> $${totalCost.toFixed(2)}</p>
                    <p><strong>Number of Nights:</strong> ${nightsInput.value}</p>
                    <p><strong>Number of People:</strong> ${peopleInput.value}</p>
                    <p><strong>Calculation Method:</strong> ${currentMethod.charAt(0).toUpperCase() + currentMethod.slice(1)}</p>
                </div>
                <h2>Cost Breakdown</h2>
                ${shares.map(({name, share}) => `
                    <div class="share-item">
                        <p>${name}: $${share.toFixed(2)}</p>
                    </div>
                `).join('')}
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function showError(message) {
    alert(message); // For now, using simple alert. Could be replaced with a better UI component
}
