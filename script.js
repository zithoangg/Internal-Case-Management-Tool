//hi
const risks = [
    { name: "SLA Missed", description: "IR Missed within queue tie / IR missed in other queue / tooling issue …" },
    { name: "Hot Zone", description: "Country with extremely high standard for CS (India, Australia, Japan, etc.)" },
    { name: "Response delay/Customer pushed/CX escalated on ICM", description: "Customer asked updates and pushing for live meeting or posting any concerns that no updates" },
    { name: "Product limit/bug/ By Design", description: "The product doesn’t satisfy customer environment or portal display issue" },
    { name: "3rd party issue/unsupported scenario", description: "3rd products, or out of Azure supporting scope" },
    { name: "SIE/Server outage/Upgrade", description: "Service outage / Service Mandatory Upgrade -> Impact Cx" },
    { name: "Collaboration issue", description: "Collaboration task owner delays or not responding or no assignment." },
    { name: "AVA/ICM Issue", description: "Long waiting time / approval in these group. Or Risky Advice" },
    { name: "Customer resolved/Issue resolved itself", description: "The issue is resolved by itself or the customer" },
    { name: "Customer disconnected/unresponsive", description: "The customer is unresponsive before we confirm the issue is resolved, or the customer doesn't want to continue working on the case" },
    { name: "Demanding customer", description: "The customer keeps asking questions and doesn't agree to open new case, or the customer is not quite satisfied with the solution or answers you provide" },
    { name: "Challenging history", description: "The customer usually gives non-5 survey even though the issue is solved by our engineers, or the customer requires you to escalate his ticket during the case handling" }
];

function generateTitle() {
    const nextContactDate = document.getElementById('nextContactDate').value;
    const serviceLevel = document.getElementById('serviceLevel').value;
    const pcy = document.getElementById('pcy').value;
    const nextAction = document.getElementById('nextActionTitle').value;
    const icmLinked = document.getElementById('icmLinked').value;

    let title = `[${serviceLevel}] - [${pcy}] - Next contact: ${nextContactDate} - ${nextAction}`;
    if (icmLinked) {
        title += ` - ICM: ${icmLinked}`;
    }
    return title;
}

function generateCaseNote() {
    const issueDescription = document.getElementById('issueDescription').value;
    const icmNeeded = document.getElementById('icmNeeded').value;
    const troubleshootingDone = document.getElementById('troubleshootingDone').value;
    const communicationTimeline = document.getElementById('communicationTimeline').value;
    const nextContact = document.getElementById('nextContactCase').value;
    const nextAction = document.getElementById('nextActionCase').value;

    // Use newlines for plain text
    let note = `Issue Description: ${issueDescription}\n\n`;
    note += `ICM Needed: ${icmNeeded}\n\n`;
    note += `Troubleshooting Done: ${troubleshootingDone}\n\n`;
    note += `Communication/Timeline: ${communicationTimeline}\n\n`;
    note += `Next Contact: ${nextContact}\n\n`;
    note += `Next Action: ${nextAction}\n`;

    return note;
}

function generateRiskNote() {
    let tableHTML = '<table><tr><th>No.</th><th>Risk</th><th>Description</th><th>Y/N</th></tr>';
    risks.forEach((risk, index) => {
        const selected = document.querySelector(`input[name="risk${index + 1}"]:checked`);
        const ynValue = selected ? selected.value : 'N';
        tableHTML += `<tr><td>${index + 1}</td><td>${risk.name}</td><td>${risk.description}</td><td>${ynValue}</td></tr>`;
    });
    tableHTML += '</table>';
    document.getElementById('riskNoteOutput').innerHTML = tableHTML; // Display the generated table
    return tableHTML; // Return HTML string for copying
}

function copyToClipboard(content, isHTML = false) {
    const tempDiv = document.createElement('div');

    if (isHTML) {
        tempDiv.innerHTML = content; // Use HTML for the table
    } else {
        tempDiv.textContent = content; // Use textContent for plain text
    }

    document.body.appendChild(tempDiv); // Append the div to the body

    const range = document.createRange();
    range.selectNodeContents(tempDiv); // Select the content of the div
    const selection = window.getSelection();
    selection.removeAllRanges(); // Clear existing selections
    selection.addRange(range); // Add the new range

    document.execCommand('copy'); // Copy the selected content
    document.body.removeChild(tempDiv); // Remove the temporary div
    alert('Copied to clipboard!');
}

// Event listeners
document.getElementById('generateTitle').addEventListener('click', () => {
    const title = generateTitle();
    document.getElementById('titleOutput').value = title;
});

document.getElementById('copyTitle').addEventListener('click', () => {
    const title = document.getElementById('titleOutput').value;
    copyToClipboard(title, false);
});

document.getElementById('generateCaseNote').addEventListener('click', () => {
    const caseNote = generateCaseNote();
    document.getElementById('caseNoteOutput').value = caseNote; // Display case note
});

document.getElementById('copyCaseNote').addEventListener('click', () => {
    const caseNote = generateCaseNote();
    copyToClipboard(caseNote, false); // Copy as plain text
});

document.getElementById('generateRiskNote').addEventListener('click', () => {
    generateRiskNote();
});

document.getElementById('copyRiskNote').addEventListener('click', () => {
    const riskNoteHTML = generateRiskNote();
    copyToClipboard(riskNoteHTML, true); // Copy the table as HTML
});