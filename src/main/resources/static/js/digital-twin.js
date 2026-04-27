// ============================================================
// VSST — digital-twin.js  (Day 18 — Global Multi-Modal)
// What-If Scenario Simulator
// ============================================================

var API_DT = window.API_BASE || window.location.origin;

var dtPanelOpen   = false;
var lastScenario  = null;

// ---- NEW GLOBAL SCENARIOS ----
var SCENARIOS = [
    // ---- EXISTING (truck/road) ----
    {
        type:        'SEVERE_WEATHER',
        icon:        '⛈️',
        label:       'Severe Weather System',
        desc:        'Extreme weather disrupts all truck routes',
        mode:        'TRUCK',
        color:       '#ef4444',
        severity:    'HIGH'
    },
    {
        type:        'HIGHWAY_BLOCKED',
        icon:        '🚧',
        label:       'Major Highway Blocked',
        desc:        'Critical road closure forces route changes',
        mode:        'TRUCK',
        color:       '#f59e0b',
        severity:    'MEDIUM'
    },
    // ---- NEW GLOBAL SCENARIOS ----
    {
        type:        'SUEZ_BLOCKAGE',
        icon:        '⚓',
        label:       'Suez Canal Blockage',
        desc:        'Canal blocked — ships rerouted via Cape of Good Hope (+14 days)',
        mode:        'SHIP',
        color:       '#06b6d4',
        severity:    'HIGH'
    },
    {
        type:        'PORT_STRIKE',
        icon:        '🪧',
        label:       'Major Port Strike',
        desc:        'Rotterdam & Hamburg docks closed — vessels holding at anchor',
        mode:        'SHIP',
        color:       '#06b6d4',
        severity:    'HIGH'
    },
    {
        type:        'AIRPORT_STRIKE',
        icon:        '✈️',
        label:       'Airport Ground Strike',
        desc:        'Staff strike at major hub airports — cargo flights delayed 4-8h',
        mode:        'PLANE',
        color:       '#e2e8f0',
        severity:    'HIGH'
    },
    {
        type:        'VOLCANIC_ASH',
        icon:        '🌋',
        label:       'Volcanic Ash Cloud',
        desc:        'European airspace partially closed — flights rerouting south',
        mode:        'PLANE',
        color:       '#e2e8f0',
        severity:    'MEDIUM'
    },
    {
        type:        'RAIL_CLOSURE',
        icon:        '🚂',
        label:       'Rail Network Closure',
        desc:        'Junction failure causing network-wide train delays',
        mode:        'TRAIN',
        color:       '#f59e0b',
        severity:    'MEDIUM'
    }
];

var modeColors = { TRUCK:'#4fc3f7', SHIP:'#06b6d4', PLANE:'#e2e8f0', TRAIN:'#f59e0b', ALL:'#a78bfa' };
var modeIcons  = { TRUCK:'🚛', SHIP:'🚢', PLANE:'✈️', TRAIN:'🚂', ALL:'🌐' };

// ----------------------------------------------------------------
// INJECT Digital Twin button into header
// ----------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
    injectDTButton();
    createDTModal();
});

function injectDTButton() {
    var headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;

    var btn = document.createElement('button');
    btn.id        = 'dtLaunchBtn';
    btn.innerHTML = '&#129302; Digital Twin';
    btn.title     = 'What-If Scenario Simulator';
    btn.style.cssText =
        'padding:7px 14px;background:rgba(167,139,250,0.12);color:#a78bfa;' +
        'border:1px solid rgba(167,139,250,0.3);border-radius:8px;font-size:12px;' +
        'font-weight:600;cursor:pointer;font-family:Inter,sans-serif;' +
        'transition:all 0.2s;margin-right:8px;';
    btn.addEventListener('mouseenter', function() {
        btn.style.background = 'rgba(167,139,250,0.22)';
    });
    btn.addEventListener('mouseleave', function() {
        btn.style.background = 'rgba(167,139,250,0.12)';
    });
    btn.onclick = openDTPanel;

    // Insert before disruption button
    var disruptBtn = document.getElementById('triggerDisruptionBtn');
    if (disruptBtn) {
        headerActions.insertBefore(btn, disruptBtn);
    } else {
        headerActions.insertBefore(btn, headerActions.firstChild);
    }
}

// ----------------------------------------------------------------
// CREATE MODAL
// ----------------------------------------------------------------
function createDTModal() {
    if (document.getElementById('dtModal')) return;

    var modal = document.createElement('div');
    modal.id  = 'dtModal';
    modal.style.cssText =
        'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);' +
        'z-index:6000;align-items:center;justify-content:center;padding:20px;';

    modal.innerHTML =
        '<div style="background:#0d0d26;border:1px solid #252550;border-radius:16px;' +
        'width:100%;max-width:720px;max-height:90vh;overflow-y:auto;' +
        'box-shadow:0 24px 64px rgba(0,0,0,0.7);">' +

        // Header
        '<div style="padding:20px 24px;border-bottom:1px solid #1a1a3a;' +
        'display:flex;align-items:center;justify-content:space-between;' +
        'position:sticky;top:0;background:#0d0d26;z-index:1;">' +
        '<div>' +
        '<h2 style="color:#e2e8f0;font-size:18px;font-weight:700;margin:0 0 3px;">'+
        '&#129302; Digital Twin — What-If Simulator</h2>' +
        '<p style="color:#64748b;font-size:12px;margin:0;">'+
        'Test global disruption scenarios on current shipments without affecting live data</p>' +
        '</div>' +
        '<button onclick="closeDTPanel()" '+
        'style="width:32px;height:32px;background:rgba(255,255,255,0.05);'+
        'border:1px solid #252550;border-radius:6px;color:#94a3b8;'+
        'cursor:pointer;font-size:16px;display:flex;align-items:center;'+
        'justify-content:center;">&#10005;</button>' +
        '</div>' +

        // Body
        '<div style="padding:24px;" id="dtBody">' + buildDTContent() + '</div>' +

        '</div>';

    document.body.appendChild(modal);
}

function buildDTContent() {
    var scenarioCards = SCENARIOS.map(function(s) {
        var mColor = modeColors[s.mode] || '#94a3b8';
        var mIcon  = modeIcons[s.mode]  || '🚛';

        return '<div class="dt-scenario-card" data-type="' + s.type + '" ' +
            'onclick="selectScenario(\'' + s.type + '\')" ' +
            'style="padding:14px 16px;background:#111130;border:2px solid #1a1a3a;' +
            'border-radius:10px;cursor:pointer;transition:all 0.2s;margin-bottom:0;">' +
            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:5px;">' +
            '<span style="font-size:22px;">' + s.icon + '</span>' +
            '<strong style="color:#e2e8f0;font-size:14px;">' + s.label + '</strong>' +
            // NEW: Mode Badge
            '<span style="font-size:9px;font-weight:700;padding:1px 7px;border-radius:6px;' +
            'background:' + mColor + '18;color:' + mColor + ';' +
            'border:1px solid ' + mColor + '30;margin-left:auto;">' +
            mIcon + ' ' + s.mode +
            '</span>' +
            '</div>' +
            '<p style="color:#64748b;font-size:12px;margin:0;">' + s.desc + '</p>' +
            '</div>';
    }).join('');

    return '<div style="margin-bottom:20px;">' +
        '<div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;' +
        'letter-spacing:1px;margin-bottom:12px;">1. SELECT SCENARIO</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
        scenarioCards + '</div>' +
        '</div>' +

        '<div style="margin-bottom:20px;">' +
        '<div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;' +
        'letter-spacing:1px;margin-bottom:12px;">2. CONFIGURE</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +

        '<div>' +
        '<label style="display:block;font-size:12px;color:#94a3b8;margin-bottom:6px;">'+
        'Affected Location / Region</label>' +
        '<input id="dtLocation" placeholder="e.g. Suez Canal, Egypt" ' +
        'style="width:100%;background:#111130;border:1px solid #252550;' +
        'border-radius:8px;color:#e2e8f0;font-family:Inter,sans-serif;' +
        'font-size:13px;padding:9px 13px;outline:none;box-sizing:border-box;' +
        'transition:border-color 0.2s;" ' +
        'onfocus="this.style.borderColor=\'#a78bfa\'" ' +
        'onblur="this.style.borderColor=\'#252550\'"/>' +
        '</div>' +

        '<div>' +
        '<label style="display:block;font-size:12px;color:#94a3b8;margin-bottom:6px;">'+
        'Duration (hours)</label>' +
        '<select id="dtDuration" ' +
        'style="width:100%;background:#111130;border:1px solid #252550;' +
        'border-radius:8px;color:#e2e8f0;font-family:Inter,sans-serif;' +
        'font-size:13px;padding:9px 13px;outline:none;box-sizing:border-box;">' +
        '<option value="2">2 hours</option>' +
        '<option value="6">6 hours</option>' +
        '<option value="24" selected>24 hours</option>' +
        '<option value="72">72 hours (3 days)</option>' +
        '<option value="168">168 hours (1 week)</option>' +
        '<option value="336">336 hours (2 weeks)</option>' +
        '</select>' +
        '</div>' +

        '</div></div>' +

        '<div style="margin-bottom:20px;">' +
        '<button id="dtRunBtn" onclick="runSimulation()" ' +
        'style="width:100%;padding:12px;background:rgba(167,139,250,0.15);' +
        'color:#a78bfa;border:2px solid rgba(167,139,250,0.4);border-radius:10px;' +
        'font-size:14px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;' +
        'transition:all 0.2s;" ' +
        'onmouseover="this.style.background=\'rgba(167,139,250,0.25)\'" ' +
        'onmouseout="this.style.background=\'rgba(167,139,250,0.15)\'">' +
        '&#9654; Run Simulation' +
        '</button>' +
        '</div>' +

        '<div id="dtResults" style="display:none;"></div>';
}

// ----------------------------------------------------------------
// SCENARIO SELECTION
// ----------------------------------------------------------------
var selectedScenarioType = null;

function selectScenario(type) {
    selectedScenarioType = type;

    // Update card styles
    document.querySelectorAll('.dt-scenario-card').forEach(function(card) {
        if (card.dataset.type === type) {
            card.style.borderColor = '#a78bfa';
            card.style.background  = 'rgba(167,139,250,0.1)';
        } else {
            card.style.borderColor = '#1a1a3a';
            card.style.background  = '#111130';
        }
    });

    // Auto-fill a suggested location based on the new global scenarios
    var locationInput = document.getElementById('dtLocation');
    if (locationInput) {
        var suggestions = {
            'SEVERE_WEATHER':  'Western Ghats',
            'HIGHWAY_BLOCKED': 'Karnataka',
            'SUEZ_BLOCKAGE':   'Suez Canal, Egypt',
            'PORT_STRIKE':     'Port of Rotterdam',
            'AIRPORT_STRIKE':  'Frankfurt Airport',
            'VOLCANIC_ASH':    'Iceland',
            'RAIL_CLOSURE':    'DB Network, Germany'
        };
        locationInput.placeholder = 'e.g. ' + (suggestions[type] || 'Global');
        locationInput.value = ''; // Clear value so placeholder shows
    }
}

// ----------------------------------------------------------------
// RUN SIMULATION
// ----------------------------------------------------------------
async function runSimulation() {
    if (!selectedScenarioType) {
        showDTError('Please select a scenario type first.');
        return;
    }

    var location = document.getElementById('dtLocation').value.trim() ||
        document.getElementById('dtLocation').placeholder.replace('e.g. ', '');
    var duration = parseInt(document.getElementById('dtDuration').value);

    var btn = document.getElementById('dtRunBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '&#128260; Simulating...'; }

    var results = document.getElementById('dtResults');
    if (results) results.style.display = 'none';

    try {
        var resp = await fetch(API_DT + '/api/scenarios/simulate', {
            method:      'POST',
            headers:     { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                type:          selectedScenarioType,
                location:      location,
                durationHours: duration
            })
        });

        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var data = await resp.json();

        lastScenario = data;
        renderSimulationResults(data);

    } catch (e) {
        showDTError('Simulation failed: ' + e.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '&#9654; Run Simulation';
        }
    }
}

function renderSimulationResults(data) {
    var results = document.getElementById('dtResults');
    if (!results) return;

    var scenario = SCENARIOS.find(function(s) { return s.type === data.scenarioType; });
    var icon     = scenario ? scenario.icon : '📋';
    var color    = scenario ? scenario.color : '#94a3b8';

    var impact       = data.impact || {};
    var opImpact     = impact.operationalImpact || 'UNKNOWN';
    var impactColor  = opImpact === 'HIGH'   ? '#ef4444' :
        opImpact === 'MEDIUM' ? '#f59e0b' :
            opImpact === 'LOW'    ? '#10b981' : '#4fc3f7';

    var affectedIds = (data.affectedIds || []).join(', ') || 'None';

    results.style.display = 'block';
    results.innerHTML =
        '<div style="border-top:1px solid #1a1a3a;padding-top:20px;">' +
        '<div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;' +
        'letter-spacing:1px;margin-bottom:14px;">3. SIMULATION RESULTS</div>' +

        // Result header
        '<div style="background:rgba(167,139,250,0.07);border:1px solid rgba(167,139,250,0.2);' +
        'border-radius:10px;padding:16px;margin-bottom:14px;">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">' +
        '<span style="font-size:28px;">' + icon + '</span>' +
        '<div>' +
        '<div style="font-size:15px;font-weight:700;color:#e2e8f0;">' +
        (scenario ? scenario.label : data.scenarioType) + ' Scenario' +
        '</div>' +
        '<div style="font-size:12px;color:#64748b;">' +
        data.location + ' &bull; ' + data.durationHours + ' hours duration' +
        '</div>' +
        '</div>' +
        '<span style="margin-left:auto;padding:4px 12px;border-radius:8px;font-size:11px;' +
        'font-weight:700;background:' + impactColor + '1a;color:' + impactColor + ';' +
        'border:1px solid ' + impactColor + '33;">' + opImpact + ' IMPACT</span>' +
        '</div>' +

        // Impact grid
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">' +
        buildImpactBox('Affected', data.affectedCount + ' / ' + data.totalShipments, color) +
        buildImpactBox('ETA Delay', '+' + (impact.etaDelayHours || 0) + ' hrs', '#f59e0b') +
        buildImpactBox('Cargo at Risk', (impact.cargoAtRiskTons || 0) + ' t', '#ef4444') +
        buildImpactBox('Route Health', (impact.routeHealthAfter || 0) + '%',
            (impact.routeHealthAfter || 0) >= 70 ? '#10b981' : '#f59e0b') +
        '</div>' +
        '</div>' +

        // Affected shipments
        (data.affectedCount > 0
            ? '<div style="background:#111130;border:1px solid #1a1a3a;border-radius:8px;' +
            'padding:12px 16px;margin-bottom:14px;">' +
            '<div style="font-size:11px;color:#64748b;margin-bottom:6px;">AFFECTED SHIPMENTS</div>' +
            '<div style="font-family:monospace;font-size:12px;color:#a78bfa;">' +
            affectedIds + '</div>' +
            '</div>'
            : '') +

        // AI Recommendation
        '<div style="background:rgba(79,195,247,0.06);border:1px solid rgba(79,195,247,0.15);' +
        'border-radius:8px;padding:14px 16px;margin-bottom:16px;">' +
        '<div style="font-size:11px;font-weight:600;color:#4fc3f7;margin-bottom:6px;">' +
        '&#129302; AI RECOMMENDATION' +
        '</div>' +
        '<p style="font-size:13px;color:#e2e8f0;line-height:1.7;margin:0;">' +
        escapeHtmlDT(data.recommendation || '') +
        '</p>' +
        '</div>' +

        // Action buttons
        '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
        '<button onclick="applyScenario()" ' +
        'style="flex:1;padding:10px;background:rgba(239,68,68,0.12);color:#ef4444;' +
        'border:1px solid rgba(239,68,68,0.3);border-radius:8px;font-size:13px;' +
        'font-weight:600;cursor:pointer;font-family:Inter,sans-serif;">' +
        '&#9889; Apply to Live System' +
        '</button>' +
        '<button onclick="exportScenarioReport()" ' +
        'style="flex:1;padding:10px;background:rgba(79,195,247,0.1);color:#4fc3f7;' +
        'border:1px solid rgba(79,195,247,0.3);border-radius:8px;font-size:13px;' +
        'font-weight:600;cursor:pointer;font-family:Inter,sans-serif;">' +
        '&#8659; Export Report' +
        '</button>' +
        '<button onclick="runSimulation()" ' +
        'style="flex:1;padding:10px;background:rgba(167,139,250,0.1);color:#a78bfa;' +
        'border:1px solid rgba(167,139,250,0.3);border-radius:8px;font-size:13px;' +
        'font-weight:600;cursor:pointer;font-family:Inter,sans-serif;">' +
        '&#8635; Re-run' +
        '</button>' +
        '</div>' +

        '</div>';
}

function buildImpactBox(label, value, color) {
    return '<div style="background:#0d0d26;border:1px solid #1a1a3a;border-radius:8px;' +
        'padding:10px;text-align:center;">' +
        '<div style="font-size:18px;font-weight:700;font-family:monospace;' +
        'color:' + color + ';margin-bottom:3px;">' + value + '</div>' +
        '<div style="font-size:10px;color:#64748b;text-transform:uppercase;' +
        'letter-spacing:0.5px;">' + label + '</div>' +
        '</div>';
}

// ----------------------------------------------------------------
// APPLY scenario to live system (trigger real disruptions)
// ----------------------------------------------------------------
async function applyScenario() {
    if (!lastScenario || lastScenario.affectedCount === 0) {
        alert('No shipments to affect. Run a simulation first.');
        return;
    }

    var confirmed = confirm(
        '⚠️ Apply this scenario to LIVE data?\n\n' +
        'This will mark ' + lastScenario.affectedCount + ' shipment(s) as DELAYED ' +
        'and create real disruption records.\n\n' +
        'Affected: ' + (lastScenario.affectedIds || []).join(', ') + '\n\n' +
        'Click OK to confirm.'
    );

    if (!confirmed) return;

    try {
        // Trigger the disruption API for each affected shipment
        var resp = await fetch(API_DT + '/api/disruptions/trigger', {
            method:      'POST',
            headers:     { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (resp.ok) {
            closeDTPanel();
            if (typeof showToast === 'function') {
                showToast('danger', '&#129302; Scenario Applied',
                    lastScenario.affectedCount + ' shipment(s) affected. ' +
                    'Check notifications for details.');
            }
            if (typeof loadShipments === 'function') loadShipments();
        }
    } catch (e) {
        showDTError('Could not apply scenario: ' + e.message);
    }
}

// ----------------------------------------------------------------
// EXPORT scenario report as text file
// ----------------------------------------------------------------
function exportScenarioReport() {
    if (!lastScenario) return;

    var scenario = SCENARIOS.find(function(s) { return s.type === lastScenario.scenarioType; });
    var impact   = lastScenario.impact || {};

    var report =
        'LOGIPULSE DIGITAL TWIN — SCENARIO REPORT\n' +
        '==========================================\n\n' +
        'Generated: ' + new Date().toLocaleString('en-IN') + '\n\n' +
        'SCENARIO: ' + (scenario ? scenario.label : lastScenario.scenarioType) + '\n' +
        'Location: ' + lastScenario.location + '\n' +
        'Duration: ' + lastScenario.durationHours + ' hours\n\n' +
        'IMPACT SUMMARY\n' +
        '--------------\n' +
        'Affected Shipments : ' + lastScenario.affectedCount + ' of ' + lastScenario.totalShipments + '\n' +
        'ETA Delay          : +' + (impact.etaDelayHours || 0) + ' hours\n' +
        'Cargo at Risk      : ' + (impact.cargoAtRiskTons || 0) + ' tonnes\n' +
        'Route Health After : ' + (impact.routeHealthAfter || 0) + '%\n' +
        'Operational Impact : ' + (impact.operationalImpact || 'N/A') + '\n\n' +
        'AFFECTED SHIPMENTS\n' +
        '------------------\n' +
        (lastScenario.affectedIds || []).join('\n') + '\n\n' +
        'AI RECOMMENDATION\n' +
        '-----------------\n' +
        (lastScenario.recommendation || '') + '\n\n' +
        '==========================================\n' +
        'LogiPulse AI Control Tower — Digital Twin\n';

    var blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = 'dt_scenario_' + lastScenario.scenarioType.toLowerCase() + '_' +
        new Date().toISOString().slice(0,10) + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ----------------------------------------------------------------
// OPEN / CLOSE
// ----------------------------------------------------------------
function openDTPanel() {
    var modal = document.getElementById('dtModal');
    if (modal) modal.style.display = 'flex';
}

function closeDTPanel() {
    var modal = document.getElementById('dtModal');
    if (modal) modal.style.display = 'none';
}

function showDTError(msg) {
    var results = document.getElementById('dtResults');
    if (!results) return;
    results.style.display = 'block';
    results.innerHTML =
        '<div style="padding:14px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);' +
        'border-radius:8px;color:#ef4444;font-size:13px;">&#9888; ' + msg + '</div>';
}

function escapeHtmlDT(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(String(text || '')));
    return div.innerHTML;
}

// Close on overlay click
document.addEventListener('click', function (e) {
    var modal = document.getElementById('dtModal');
    if (modal && e.target === modal) closeDTPanel();
});