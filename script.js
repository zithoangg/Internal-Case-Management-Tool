/* Internal Case Management - frontend logic (vanilla) */
const risks = [
    { name: "SLA Missed", description: "IR Missed within queue tie / IR missed in other queue / tooling issue…." },
    { name: "Hot Zone", description: "Country with extremely high standard for CS (India, Australia, Japan, etc.)" },
    { name: "Response delay/Customer pushed/CX escalated on ICM", description: "Customer asked updates and pushing for live meeting or posting concerns" },
    { name: "Product limit/bug/ By Design", description: "The product doesn’t satisfy customer environment or portal display issue" },
    { name: "3rd party issue/unsupported scenario", description: "3rd products, or out of Azure supporting scope" },
    { name: "SIE/Server outage/Upgrade", description: "Service outage / Mandatory upgrade -> Impact CX" },
    { name: "Collaboration issue", description: "Collaboration task owner delays or not responding or no assignment." },
    { name: "AVA/ICM Issue", description: "Long waiting time / approval / risky advice" },
    { name: "Customer resolved/Issue resolved itself", description: "The issue is resolved by itself or the customer" },
    { name: "Customer disconnected/unresponsive", description: "Customer unresponsive before confirmation or unwilling to continue" },
    { name: "Demanding customer", description: "Customer keeps asking questions and isn't satisfied with answers" },
    { name: "Challenging history", description: "History of low surveys or repeated escalations" }
];

function el(id){ return document.getElementById(id); }

function formatDateTimeLocal(dtValue) {
    if (!dtValue) return '';
    // Accept either "2025-10-18T09:30" (native) or "2025-10-18 09:30" (flatpickr)
    return dtValue.includes('T') ? dtValue.replace('T', ' ') : dtValue;
}

function generateTitle() {
    const nextContactDate = (el('nextContactDate')?.value || '').trim();
    const serviceLevel = (el('serviceLevel')?.value || '').trim();
    const pcy = (el('pcy')?.value || '').trim();
    const nextAction = (el('nextActionTitle')?.value || '').trim();
    const icmLinked = (el('icmLinked')?.value || '').trim();

    let title = `[${serviceLevel}] - [${pcy}] - Next contact: ${nextContactDate} - ${nextAction}`;
    if (icmLinked) title += ` - ICM: ${icmLinked}`;
    return title;
}

function generateCaseNote() {
    const issueDescription = (el('issueDescription')?.value || '').trim();
    const icmNeeded = (el('icmNeeded')?.value || '').trim();
    const troubleshootingDone = (el('troubleshootingDone')?.value || '').trim();
    const communicationTimeline = (el('communicationTimeline')?.value || '').trim();
    const nextContact = (el('nextContactCase')?.value || '').trim();
    const nextAction = (el('nextActionCase')?.value || '').trim();

    // Plain text version (for fallback)
    let plain = `Issue Description:\n${issueDescription}\n\n`;
    plain += `ICM Needed:\n${icmNeeded}\n\n`;
    plain += `Troubleshooting Done:\n${troubleshootingDone}\n\n`;
    plain += `Communication / Timeline:\n${communicationTimeline}\n\n`;
    plain += `Next Contact:\n${nextContact}\n\n`;
    plain += `Next Action:\n${nextAction}\n`;

    // HTML version: headlines are bold + underlined.
    // Use a spacer div for a visible vertical gap. Do NOT insert "&nbsp;" — leave content empty when there is no user text.
    const h = (text) => `<div><b><u>${text}</u></b></div>`;
    const spacer = `<div style="height:10px;"></div>`;
    const contentHtml = (v) => v ? escapeHtml(v) : ''; // empty when no user content

    let html = '';
    html += h('Issue Description:') + spacer + `<div class="case-content">${contentHtml(issueDescription)}</div>`;
    html += `<br>`;
    html += h('ICM Needed:') + spacer + `<div class="case-content">${contentHtml(icmNeeded)}</div>`;
    html += `<br>`;
    html += h('Troubleshooting Done:') + spacer + `<div class="case-content">${contentHtml(troubleshootingDone)}</div>`;
    html += `<br>`;
    html += h('Communication / Timeline:') + spacer + `<div class="case-content">${contentHtml(communicationTimeline)}</div>`;
    html += `<br>`;
    html += h('Next Contact:') + spacer + `<div class="case-content">${contentHtml(nextContact)}</div>`;
    html += `<br>`;
    html += h('Next Action:') + spacer + `<div class="case-content">${contentHtml(nextAction)}</div>`;

    return { html, plain };
}

// small helper to avoid injecting raw HTML from inputs
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
        .replaceAll('\n', '<br>');
}

function generateRiskNote() {
    let html = `<table style="width:100%;border-collapse:collapse;font-size:0.95rem;">`;
    html += `<thead><tr><th style="text-align:left;padding:6px;border-bottom:1px solid #e6eefb">No.</th><th style="text-align:left;padding:6px;border-bottom:1px solid #e6eefb">Risk</th><th style="text-align:left;padding:6px;border-bottom:1px solid #e6eefb">Description</th><th style="text-align:left;padding:6px;border-bottom:1px solid #e6eefb">Y/N</th></tr></thead><tbody>`;
    let plain = '';
    risks.forEach((r, idx) => {
        const name = `risk${idx+1}`;
        const checked = document.querySelector(`input[name="${name}"]:checked`);
        const val = (checked && checked.value) ? checked.value : 'N';
        html += `<tr><td style="padding:6px;border-top:1px solid #f1f7ff">${idx+1}</td><td style="padding:6px;border-top:1px solid #f1f7ff">${r.name}</td><td style="padding:6px;border-top:1px solid #f1f7ff">${r.description}</td><td style="padding:6px;border-top:1px solid #f1f7ff">${val}</td></tr>`;
        plain += `${idx+1}. ${r.name} — ${val}\n`;
    });
    html += `</tbody></table>`;
    const out = el('riskNoteOutput');
    if (out) out.innerHTML = html;
    return { html, plain };
}

function generateSOAPNote() {
    const subject = (el('soapSubject')?.value || '').trim();
    const subscriptionId = (el('soapSubscriptionId')?.value || '').trim();
    const resourceId = (el('soapResourceId')?.value || '').trim();
    const timeframeRaw = (el('soapTimeframe')?.value || '').trim();
    const timeframe = formatDateTimeLocal(timeframeRaw);
    const isFqr = (el('soapIsFqr')?.value || '').trim();
    const possibleFdr = (el('soapPossibleFdr')?.value || '').trim();
    const fdrExplain = (el('soapFdrExplain')?.value || '').trim();
    const ascViewed = (el('soapAscViewed')?.value || '').trim();
    const ascInsights = (el('soapAscInsights')?.value || '').trim();
    const ascDetails = (el('soapAscDetails')?.value || '').trim();
    const assessment = (el('soapAssessment')?.value || '').trim();
    const plan = (el('soapPlan')?.value || '').trim();

    let soap = `S – Subjective / Issue Description:\n${subject}\n\n`;
    soap += `O – Objective / Environment:\n`;
    soap += `Subscription ID: ${subscriptionId}\n`;
    soap += `Affected Resource ID: ${resourceId}\n`;
    soap += `Timeframe of Issue Observation: ${timeframe}\n`;
    soap += `Is FQR Sent: ${isFqr}\n`;
    soap += `Possible FDR: ${possibleFdr}\n`;
    if (fdrExplain) soap += `FDR explanation: ${fdrExplain}\n`;
    soap += `Has ASC Been Viewed/Used in the Case: ${ascViewed}\n`;
    soap += `Any Insights Generated in ASC: ${ascInsights}\n`;
    if (ascDetails) soap += `ASC Insights Details: ${ascDetails}\n`;
    soap += `\nA – Assessment:\n${assessment}\n\n`;
    soap += `P – Plan:\n${plan}\n`;
    return soap;
}

function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

function copyToClipboard(text, options = { asHTML:false, fallbackPlain:'' }) {
    if (options.asHTML && navigator.clipboard && window.ClipboardItem) {
        const blobPlain = new Blob([options.fallbackPlain || stripHtml(text)], { type: 'text/plain' });
        const blobHtml = new Blob([text], { type: 'text/html' });
        navigator.clipboard.write([ new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobPlain }) ])
            .then(()=> alert('Copied to clipboard!'))
            .catch(()=> fallbackPlainCopy(options.fallbackPlain || stripHtml(text)));
    } else {
        fallbackPlainCopy(text);
    }
}

function fallbackPlainCopy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(()=> alert('Copied to clipboard!')).catch(()=> {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); alert('Copied to clipboard!'); } catch(e){ console.error('Copy failed', e); }
            document.body.removeChild(ta);
        });
    } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); alert('Copied to clipboard!'); } catch(e){ console.error('Copy failed', e); }
        document.body.removeChild(ta);
    }
}

/* Wire up events */
document.addEventListener('DOMContentLoaded', () => {

    // --- Bootstrap-friendly date & datetime pickers ---
    // Next contact date: date-only (Bootstrap DatePicker)
    if (window.jQuery && $('#nextContactDate').length) {
        $('#nextContactDate').datepicker({
            format: 'yyyy-mm-dd',    // machine-friendly (generateTitle expects this)
            autoclose: true,
            todayHighlight: true,
            orientation: "bottom auto"
        }).on('changeDate', function(e){
            // keep the native input value in yyyy-mm-dd (done automatically), update any UI flags used elsewhere
            // no-op placeholder to ensure compatibility with existing generateTitle()
        });

        // Timeframe of observation: datetime (Tempus Dominus)
        // wrap input if not already wrapped by an input-group (tempusdominus works with the input)
        if (window.moment && window.tempusDominus || window.tempusdominus || typeof $.fn.datetimepicker === 'function') {
            try {
                // Try tempusdominus (Bootstrap 4) initialization
                $('#soapTimeframe').datetimepicker({
                    format: 'YYYY-MM-DD HH:mm',     // machine-friendly string used by generateSOAPNote -> formatDateTimeLocal
                    icons: {
                        time: 'fas fa-clock',
                        date: 'fas fa-calendar',
                        up: 'fas fa-chevron-up',
                        down: 'fas fa-chevron-down',
                        previous: 'fas fa-chevron-left',
                        next: 'fas fa-chevron-right',
                        today: 'far fa-calendar-check',
                        clear: 'far fa-trash-alt',
                        close: 'fas fa-times'
                    },
                    sideBySide: true,
                    stepping: 5,
                    showClose: true
                });

                // When user selects a date/time, ensure the input value is in the expected machine format
                $('#soapTimeframe').on('change.datetimepicker', function(e){
                    // e.date is a moment object in tempusdominus v5; format and set input value
                    if (e && e.date && typeof e.date.format === 'function') {
                        const formatted = e.date.format('YYYY-MM-DD HH:mm');
                        // set both the visible input value and underlying value used by your code
                        $(this).find('input').val(formatted);
                        // if the input is the element itself:
                        if ($(this).is('input')) $(this).val(formatted);
                    }
                });
            } catch (err) {
                // fallback: use simple bootstrap-datepicker (date-only) if datetime picker fails
                $('#soapTimeframe').datepicker({
                    format: 'yyyy-mm-dd',
                    autoclose: true,
                    todayHighlight: true
                });
            }
        }
    }

    // --- keep the rest of your wiring as-is ---
    el('generateTitle')?.addEventListener('click', () => el('titleOutput').value = generateTitle());
    el('copyTitle')?.addEventListener('click', () => copyToClipboard(el('titleOutput').value || generateTitle(), { asHTML:false }));

    el('generateCaseNote')?.addEventListener('click', () => {
        const { html } = generateCaseNote();
        const out = el('caseNoteOutput');
        if (out) out.innerHTML = html;
    });
    el('copyCaseNote')?.addEventListener('click', () => {
        const out = el('caseNoteOutput');
        if (!out) return;
        const html = out.innerHTML;
        const plain = stripHtml(html);
        copyToClipboard(html, { asHTML:true, fallbackPlain: plain });
    });

    el('generateRiskNote')?.addEventListener('click', () => generateRiskNote());
    el('copyRiskNote')?.addEventListener('click', () => {
        const out = el('riskNoteOutput');
        if (!out) return;
        const html = out.innerHTML;
        const plain = stripHtml(html);
        copyToClipboard(html, { asHTML:true, fallbackPlain: plain });
    });

    el('generateSOAPNote')?.addEventListener('click', () => el('soapOutput').value = generateSOAPNote());
    el('copySOAPNote')?.addEventListener('click', () => {
        const out = el('soapOutput');
        const text = (out && out.value) ? out.value : generateSOAPNote();
        copyToClipboard(text, { asHTML:false });
    });

    document.querySelectorAll('.risk-table input[type="radio"]').forEach(r => r.addEventListener('change', () => generateRiskNote()));
    generateRiskNote();
});
