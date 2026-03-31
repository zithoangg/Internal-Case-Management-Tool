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
    const objective = (el('soapObjective')?.value || '').trim();

    const h = (text) => `<div><b><u>${text}</u></b></div>`;
    const spacer = `<div style="height:10px;"></div>`;
    const c = (v) => v ? escapeHtml(v) : '';

    let html = '';
    html += h('S – Subjective / Issue Description:') + spacer + `<div>${c(subject)}</div><br>`;
    html += h('O – Objective / Environment:') + spacer;
    if (objective) html += `<div>${c(objective)}</div>`;
    html += `<div>Subscription ID: ${c(subscriptionId)}</div>`;
    html += `<div>Affected Resource ID: ${c(resourceId)}</div>`;
    html += `<div>Timeframe of Issue Observation: ${c(timeframe)}</div>`;
    html += `<div>Is FQR Sent: ${c(isFqr)}</div>`;
    html += `<div>Possible FDR: ${c(possibleFdr)}</div>`;
    if (fdrExplain) html += `<div>FDR explanation: ${c(fdrExplain)}</div>`;
    html += `<div>Has ASC Been Viewed/Used in the Case: ${c(ascViewed)}</div>`;
    html += `<div>Any Insights Generated in ASC: ${c(ascInsights)}</div>`;
    if (ascDetails) html += `<div>ASC Insights Details: ${c(ascDetails)}</div>`;
    html += `<br>` + h('A – Assessment:') + spacer + `<div>${c(assessment)}</div><br>`;
    html += h('P – Plan:') + spacer + `<div>${c(plan)}</div>`;

    // Plain text fallback
    let plain = `S – Subjective / Issue Description:\n${subject}\n\n`;
    plain += `O – Objective / Environment:\n`;
    if (objective) plain += `${objective}\n\n`;
    plain += `Subscription ID: ${subscriptionId}\n`;
    plain += `Affected Resource ID: ${resourceId}\n`;
    plain += `Timeframe of Issue Observation: ${timeframe}\n`;
    plain += `Is FQR Sent: ${isFqr}\n`;
    plain += `Possible FDR: ${possibleFdr}\n`;
    if (fdrExplain) plain += `FDR explanation: ${fdrExplain}\n`;
    plain += `Has ASC Been Viewed/Used in the Case: ${ascViewed}\n`;
    plain += `Any Insights Generated in ASC: ${ascInsights}\n`;
    if (ascDetails) plain += `ASC Insights Details: ${ascDetails}\n`;
    plain += `\nA – Assessment:\n${assessment}\n\n`;
    plain += `P – Plan:\n${plan}\n`;

    return { html, plain };
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

/* ── Enhanced drum-roller time interaction ── */
function enhanceTimeDrums(fp) {
    if (!fp || !fp.calendarContainer) return;
    const wrappers = fp.calendarContainer.querySelectorAll('.flatpickr-time .numInputWrapper');
    wrappers.forEach(function(wrap) {
        if (wrap._drumEnhanced) return;  // don't double-bind
        wrap._drumEnhanced = true;

        const input = wrap.querySelector('input');
        if (!input) return;

        // ── Add decorative elements ──
        if (!wrap.querySelector('.drum-arrow')) {
            const arrowUp = document.createElement('span');
            arrowUp.className = 'drum-arrow up';
            const arrowDown = document.createElement('span');
            arrowDown.className = 'drum-arrow down';
            const hint = document.createElement('span');
            hint.className = 'scroll-hint';
            hint.textContent = 'scroll · drag';
            wrap.appendChild(arrowUp);
            wrap.appendChild(arrowDown);
            wrap.appendChild(hint);
        }

        // ── Helper: change value by step ──
        function stepValue(direction) {
            // direction: 1 = up, -1 = down
            const step = parseInt(input.step) || 1;
            const min  = parseInt(input.min)  || 0;
            const max  = parseInt(input.max)  || 59;
            let val = parseInt(input.value) || 0;

            val += direction * step;
            if (val > max) val = min;
            if (val < min) val = max;

            input.value = String(val).padStart(2, '0');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));

            // Bump animation
            input.classList.remove('bump-up', 'bump-down');
            void input.offsetWidth; // force reflow
            input.classList.add(direction > 0 ? 'bump-up' : 'bump-down');
            setTimeout(function() { input.classList.remove('bump-up', 'bump-down'); }, 260);
        }

        // ── Scroll wheel ──
        wrap.addEventListener('wheel', function(e) {
            e.preventDefault();
            e.stopPropagation();
            stepValue(e.deltaY < 0 ? 1 : -1);
        }, { passive: false });

        // ── Click + Drag ──
        let dragStartY = null;
        let dragAccumulator = 0;
        const DRAG_THRESHOLD = 18; // px per step

        wrap.addEventListener('mousedown', function(e) {
            if (e.target === input && document.activeElement === input) return; // let normal focus work
            e.preventDefault();
            dragStartY = e.clientY;
            dragAccumulator = 0;
            wrap.classList.add('dragging');
            document.body.style.cursor = 'ns-resize';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', function(e) {
            if (dragStartY === null) return;
            const delta = dragStartY - e.clientY;
            dragAccumulator += delta;
            dragStartY = e.clientY;

            if (Math.abs(dragAccumulator) >= DRAG_THRESHOLD) {
                const steps = Math.trunc(dragAccumulator / DRAG_THRESHOLD);
                stepValue(steps > 0 ? 1 : -1);
                dragAccumulator -= steps * DRAG_THRESHOLD;
            }
        });

        document.addEventListener('mouseup', function() {
            if (dragStartY === null) return;
            dragStartY = null;
            dragAccumulator = 0;
            wrap.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        });

        // ── Touch drag (mobile) ──
        let touchStartY = null;
        let touchAccum = 0;

        wrap.addEventListener('touchstart', function(e) {
            touchStartY = e.touches[0].clientY;
            touchAccum = 0;
            wrap.classList.add('dragging');
        }, { passive: true });

        wrap.addEventListener('touchmove', function(e) {
            if (touchStartY === null) return;
            e.preventDefault();
            const delta = touchStartY - e.touches[0].clientY;
            touchAccum += delta;
            touchStartY = e.touches[0].clientY;

            if (Math.abs(touchAccum) >= DRAG_THRESHOLD) {
                const steps = Math.trunc(touchAccum / DRAG_THRESHOLD);
                stepValue(steps > 0 ? 1 : -1);
                touchAccum -= steps * DRAG_THRESHOLD;
            }
        }, { passive: false });

        wrap.addEventListener('touchend', function() {
            touchStartY = null;
            touchAccum = 0;
            wrap.classList.remove('dragging');
        });

        // ── Keyboard arrows when focused ──
        input.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowUp') { e.preventDefault(); stepValue(1); }
            if (e.key === 'ArrowDown') { e.preventDefault(); stepValue(-1); }
        });
    });
}

/* Wire up events */
document.addEventListener('DOMContentLoaded', () => {

    // --- Flatpickr date & datetime pickers ---
    if (typeof flatpickr === 'function') {
        // Next contact date: date-only
        flatpickr('#nextContactDate', {
            dateFormat: 'Y-m-d',
            allowInput: true,
            animate: true
        });

        // Timeframe of observation: date + time
        flatpickr('#soapTimeframe', {
            enableTime: true,
            dateFormat: 'Y-m-d H:i',
            time_24hr: true,
            minuteIncrement: 5,
            allowInput: true,
            animate: true,
            onReady: function(_, __, fp) { enhanceTimeDrums(fp); },
            onOpen: function(_, __, fp) { enhanceTimeDrums(fp); }
        });
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

    el('generateSOAPNote')?.addEventListener('click', () => {
        const { html } = generateSOAPNote();
        const out = el('soapOutput');
        if (out) out.innerHTML = html;
    });
    el('copySOAPNote')?.addEventListener('click', () => {
        const out = el('soapOutput');
        if (!out) return;
        const html = out.innerHTML;
        const plain = stripHtml(html);
        copyToClipboard(html, { asHTML:true, fallbackPlain: plain });
    });

});
