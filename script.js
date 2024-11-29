// DOM Elements
const generateTableBtn = document.getElementById('generate-table');
const calculateBtn = document.getElementById('calculate');
const selectAllBtn = document.getElementById('select-all');
const clearAllBtn = document.getElementById('clear-all');
const shareResultsBtn = document.getElementById('share-results');
const downloadPdfBtn = document.getElementById('download-pdf');

const tripNameInput = document.getElementById('trip-name');
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

const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');

let chart = null;
let participantNames = [];

// Event Listeners
generateTableBtn.addEventListener('click', generateAttendanceTable);
calculateBtn.addEventListener('click', calculateShares);
selectAllBtn.addEventListener('click', selectAllNights);
clearAllBtn.addEventListener('click', clearAllNights);
shareResultsBtn.addEventListener('click', shareResults);
downloadPdfBtn.addEventListener('click', downloadPdf);
peopleInput.addEventListener('change', updateNameInputs);

document.querySelectorAll('input[name="calc-method"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        // Update selected styles
        document.querySelectorAll('.radio-container').forEach(container => {
            container.classList.remove('selected');
        });
        e.target.closest('.radio-container').classList.add('selected');
        
        // Show/hide additional inputs
        percentageInputs.classList.toggle('hidden', e.target.value !== 'percentage');
        weightedInputs.classList.toggle('hidden', e.target.value !== 'weighted');
        
        if (e.target.value === 'percentage') {
            updatePercentageInputs();
        }
        if (e.target.value === 'weighted') {
            updateWeightedInputs();
        }
    });
});

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
}

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

// Update percentage inputs when number of people changes
function updatePercentageInputs() {
    const numPeople = parseInt(peopleInput.value) || 0;
    percentagesContainer.innerHTML = '';
    
    for (let i = 0; i < numPeople; i++) {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'percentage-input-group';
        
        const label = document.createElement('label');
        label.textContent = participantNames[i] || `Person ${i + 1}`;
        
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.max = '100';
        input.step = '0.1';
        input.value = (100 / numPeople).toFixed(1);
        input.dataset.personIndex = i;
        
        input.addEventListener('input', updatePercentageTotal);
        
        inputGroup.appendChild(label);
        inputGroup.appendChild(input);
        percentagesContainer.appendChild(inputGroup);
    }
    
    updatePercentageTotal();
}

// Update weighted inputs when total cost changes
function updateWeightedInputs() {
    const totalCost = parseFloat(totalCostInput.value) || 0;
    
    // Default to 50-50 split between fixed and nightly costs
    fixedCostsInput.value = (totalCost * 0.5).toFixed(2);
    nightlyCostsInput.value = (totalCost * 0.5).toFixed(2);
    
    // Add listeners to maintain total
    [fixedCostsInput, nightlyCostsInput].forEach(input => {
        input.addEventListener('input', () => {
            const fixed = parseFloat(fixedCostsInput.value) || 0;
            const nightly = parseFloat(nightlyCostsInput.value) || 0;
            const total = fixed + nightly;
            
            if (total !== totalCost) {
                const difference = totalCost - total;
                if (input === fixedCostsInput) {
                    nightlyCostsInput.value = (parseFloat(nightlyCostsInput.value) + difference).toFixed(2);
                } else {
                    fixedCostsInput.value = (parseFloat(fixedCostsInput.value) + difference).toFixed(2);
                }
            }
        });
    });
}

// Update percentage total and validate
function updatePercentageTotal() {
    const inputs = percentagesContainer.querySelectorAll('input');
    const total = Array.from(inputs).reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);
    
    const totalElement = document.querySelector('.percentage-total span');
    totalElement.textContent = total.toFixed(1);
    
    const isValid = Math.abs(total - 100) < 0.1;
    document.querySelector('.percentage-total').classList.toggle('invalid', !isValid);
    
    return isValid;
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
        cell.addEventListener('click', () => {
            cell.classList.toggle('selected');
        });
    });
    
    // Show attendance section
    attendanceSection.classList.remove('hidden');
    resultsSection.classList.add('hidden');
}

// Calculate shares based on selected method
function calculateShares() {
    const totalCost = parseFloat(totalCostInput.value);
    if (!totalCost) {
        showError('Please enter a valid total cost');
        return;
    }
    
    const calcMethod = document.querySelector('input[name="calc-method"]:checked').value;
    const nights = parseInt(nightsInput.value);
    const people = parseInt(peopleInput.value);
    
    // Get attendance data
    const attendance = [];
    for (let i = 0; i < people; i++) {
        const personNights = [];
        const cells = attendanceTable.querySelectorAll(`tr:nth-child(${i + 2}) td.night-cell`);
        cells.forEach(cell => {
            personNights.push(cell.classList.contains('selected'));
        });
        attendance.push(personNights);
    }
    
    let shares = [];
    
    switch(calcMethod) {
        case 'equal':
            // Simple equal split
            const equalShare = totalCost / people;
            shares = Array(people).fill(equalShare);
            break;
            
        case 'nightly':
            // Calculate based on nights stayed
            const totalNights = attendance.reduce((sum, person) => 
                sum + person.filter(night => night).length, 0);
                
            if (totalNights === 0) {
                showError('Please select at least one night in the attendance table');
                return;
            }
            
            const costPerNight = totalCost / totalNights;
            shares = attendance.map(person => 
                person.filter(night => night).length * costPerNight);
            break;
            
        case 'weighted':
            // Combine fixed costs and per-night costs
            const fixedCosts = parseFloat(fixedCostsInput.value) || 0;
            const nightlyCosts = parseFloat(nightlyCostsInput.value) || 0;
            
            // Calculate fixed cost shares (equal split)
            const fixedShare = fixedCosts / people;
            
            // Calculate nightly cost shares
            const totalPersonNights = attendance.reduce((sum, person) => 
                sum + person.filter(night => night).length, 0);
            
            if (totalPersonNights === 0) {
                showError('Please select at least one night in the attendance table');
                return;
            }
            
            const costPerPersonNight = nightlyCosts / totalPersonNights;
            
            shares = attendance.map(person => {
                const nightsStayed = person.filter(night => night).length;
                return fixedShare + (nightsStayed * costPerPersonNight);
            });
            break;
            
        case 'percentage':
            // Custom percentage split
            if (!updatePercentageTotal()) {
                showError('Percentage total must equal 100%');
                return;
            }
            
            const percentages = Array.from(percentagesContainer.querySelectorAll('input'))
                .map(input => parseFloat(input.value) || 0);
            
            shares = percentages.map(percentage => totalCost * (percentage / 100));
            break;
    }
    
    displayResults(shares);
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

// Utility Functions
function selectAllNights() {
    const cells = document.querySelectorAll('.night-cell');
    cells.forEach(cell => cell.classList.add('selected'));
}

function clearAllNights() {
    const cells = document.querySelectorAll('.night-cell');
    cells.forEach(cell => cell.classList.remove('selected'));
}

function shareResults() {
    // Implementation for sharing results (could be integrated with a sharing API)
    alert('Sharing functionality will be implemented soon!');
}

function downloadPdf() {
    const tripName = tripNameInput.value || 'Trip';
    const totalCost = parseFloat(totalCostInput.value);
    const shares = [];
    
    // Collect current shares data
    participantNames.forEach((name, index) => {
        const personNights = [];
        const cells = attendanceTable.querySelectorAll(`tr:nth-child(${index + 2}) td.night-cell`);
        cells.forEach(cell => {
            personNights.push(cell.classList.contains('selected'));
        });
        
        const nightsStayed = personNights.filter(night => night).length;
        const share = (nightsStayed / parseInt(nightsInput.value)) * totalCost;
        shares.push({ name, share });
    });
    
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

// Initialize tooltips and other UI enhancements
document.addEventListener('DOMContentLoaded', () => {
    initializeDates();
    // Any initialization code can go here
});
