const risks = [
    {
        name: "SLA Missed",
        description: "IR Missed within queue tie / IR missed in other queue /tooling issue…."
    },
    {
        name: "Hot Zone",
        description: "Country with extremely high standard for CS (India, Australia, Japan, etc.)"
    },
    {
        name: "Response delay/Customer pushed/CX escalated on ICM",
        description: "Customer asked updates and pushing for live meeting or posting any concerns that no updates"
    },
    {
        name: "Product limit/bug/ By Design",
        description: "The product doesn’t satisfy customer environment or portal display issue"
    },
    {
        name: "3rd party issue/unsupported scenario",
        description: "3rd products, or out of Azure supporting scope"
    },
    {
        name: "SIE/Server outage/Upgrade",
        description: "Service outage / Service Mandatory Upgrade -> Impact Cx"
    },
    {
        name: "Collaboration issue",
        description: "Collaboration task owner delays or not responding or no assignment."
    },
    {
        name: "AVA/ICM Issue",
        description: "Long waiting time / approval in these group. Or Risky Advice"
    },
    {
        name: "Customer resolved/Issue resolved itself",
        description: "The issue is resolved by itself or the customer"
    },
    {
        name: "Customer disconnected/unresponsive",
        description: "The customer is unresponsive before we confirm the issue is resolved, or the customer doesn't want to continue working on the case"
    },
    {
        name: "Demanding customer",
        description: "The customer keeps asking questions and doesn't agree to open new case, or the customer is not quite satisfied with the solution or answers you provide"
    },
    {
        name: "Challenging history",
        description: "The customer usually gives non-5 survey even though the issue is solved by our engineers, or the customer requires you to escalate his ticket during the case handling"
    }
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
    let note = `Issue Description: \n${issueDescription}\n\n`;
    note += `ICM Needed: \n${icmNeeded}\n\n`;
    note += `Troubleshooting Done: \n${troubleshootingDone}\n\n`;
    note += `Communication/Timeline: \n${communicationTimeline}\n\n`;
    note += `Next Contact: \n${nextContact}\n\n`;
    note += `Next Action: \n${nextAction}\n`;

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

function showCustomAlert(message) {
    const alertDiv = document.getElementById('customAlert');
    const alertMessage = document.getElementById('alertMessage');
    alertMessage.textContent = message;
    alertDiv.style.display = 'block';
}

function closeCustomAlert() {
    const alertDiv = document.getElementById('customAlert');
    alertDiv.style.display = 'none';
}

function copyToClipboard(content, isHTML = false) {
    if (isHTML) {
        // If HTML, create a temporary element to hold the HTML content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content; // Use HTML for the table
        document.body.appendChild(tempDiv); // Append the div to the body

        // Use the Clipboard API to write HTML
        navigator.clipboard.write([
            new ClipboardItem({
                'text/html': new Blob([tempDiv.innerHTML], { type: 'text/html' }),
                'text/plain': new Blob([tempDiv.textContent], { type: 'text/plain' }) // Fallback for plain text
            })
        ]).then(() => {
            alert('Copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy: ', err);
        }).finally(() => {
            document.body.removeChild(tempDiv); // Clean up
        });
    } else {
        // For plain text using Clipboard API
        navigator.clipboard.writeText(content).then(() => {
            alert('Copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    }
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
    document.getElementById('caseNoteOutput').value = caseNote; //Just edited.

    navigator.clipboard.writeText(caseNote).then(() => {
        alert('Copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
});

document.getElementById('generateRiskNote').addEventListener('click', () => {
    generateRiskNote();
});

document.getElementById('copyRiskNote').addEventListener('click', () => {
    const riskNoteHTML = generateRiskNote();
    copyToClipboard(riskNoteHTML, true); // Copy the table as HTML
});