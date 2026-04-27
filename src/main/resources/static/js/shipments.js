// ============================================================
// VSST — shipments.js  (Day 18 — Global Multi-Modal)
// ============================================================

var API_BASE = window.API_BASE || window.location.origin;

var allShipments     = [];
var activeFilter     = 'ALL';
var activeModeFilter = 'ALL'; // Change 1: Added activeModeFilter
var searchQuery      = '';
var selectedMode     = 'TRUCK';

var STATUS_COLORS   = { 'IN_TRANSIT':'#4fc3f7','DELAYED':'#ef4444',
    'REROUTED':'#a78bfa','DELIVERED':'#10b981' };
var PRIORITY_COLORS = { 'HIGH':'#ef4444','NORMAL':'#f59e0b','LOW':'#10b981' };
var MODE_ICONS      = { 'TRUCK':'🚛','SHIP':'🚢','PLANE':'✈️','TRAIN':'🚂' };
var MODE_COLORS     = { 'TRUCK':'#4fc3f7','SHIP':'#06b6d4',
    'PLANE':'#f8fafc','TRAIN':'#f59e0b' };

// ----------------------------------------------------------------
// INIT
// ----------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
    if (typeof requireAuth === 'function' && !requireAuth()) return;

    var user = getCurrentUser ? getCurrentUser() : null;
    if (user) {
        var av = document.getElementById('navAvatar');
        var nm = document.getElementById('navName');
        var rl = document.getElementById('navRole');
        if (av) av.textContent = (user.fullName || user.username || 'U').charAt(0).toUpperCase();
        if (nm) nm.textContent = user.fullName || user.username || '';
        if (rl) {
            rl.textContent = user.role;
            rl.style.color = user.role === 'ADMIN' ? '#ef4444' : '#4fc3f7';
        }
    }

    loadShipments();
    setInterval(loadShipments, 15000);
});

// ----------------------------------------------------------------
// HAVERSINE
// ----------------------------------------------------------------
function calcDistanceKm(lat1, lng1, lat2, lng2) {
    if (!lat1 || !lat2) return null;
    var R    = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLng = (lng2 - lng1) * Math.PI / 180;
    var a    = Math.sin(dLat/2)*Math.sin(dLat/2) +
        Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*
        Math.sin(dLng/2)*Math.sin(dLng/2);
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

function calcProgress(s) {
    if (s.status === 'DELIVERED') return 100;
    if (!s.originLat || !s.destLat) return 0;
    var total   = euclidDist(s.originLat,s.originLng,s.destLat,s.destLng);
    var covered = euclidDist(s.originLat,s.originLng,s.currentLat,s.currentLng);
    return total === 0 ? 0 : Math.min(99, Math.round((covered/total)*100));
}

function euclidDist(a,b,c,d) {
    return Math.sqrt(Math.pow(c-a,2)+Math.pow(d-b,2));
}

// ----------------------------------------------------------------
// LOAD
// ----------------------------------------------------------------
async function loadShipments() {
    try {
        var resp = await fetch(API_BASE + '/api/shipments', { credentials:'include' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        allShipments = await resp.json();
        updateStats(allShipments);
        renderTable(getFiltered());
    } catch (e) { console.error('loadShipments:', e); }
}

// Change 2: Updated getFiltered() to include mode matching
function getFiltered() {
    return allShipments.filter(function (s) {
        var statusMatch = activeFilter === 'ALL' || s.status === activeFilter;
        var modeMatch   = activeModeFilter === 'ALL' ||
            (s.transportMode || 'TRUCK') === activeModeFilter;
        var q           = searchQuery.toLowerCase();
        var textMatch   = !q ||
            (s.trackingId   && s.trackingId.toLowerCase().includes(q))   ||
            (s.cargoType    && s.cargoType.toLowerCase().includes(q))     ||
            (s.customerName && s.customerName.toLowerCase().includes(q))  ||
            (s.origin       && s.origin.toLowerCase().includes(q))        ||
            (s.destination  && s.destination.toLowerCase().includes(q));
        return statusMatch && modeMatch && textMatch;
    });
}

// ----------------------------------------------------------------
// STATS
// ----------------------------------------------------------------
function updateStats(shipments) {
    var c = { IN_TRANSIT:0, DELAYED:0, REROUTED:0, DELIVERED:0 };
    shipments.forEach(function (s) {
        if (c[s.status] !== undefined) c[s.status]++;
    });
    set('statTotal',    shipments.length);
    set('statTransit',  c.IN_TRANSIT);
    set('statDelayed',  c.DELAYED);
    set('statRerouted', c.REROUTED);
    set('statDelivered',c.DELIVERED);
}

function set(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
}

// ----------------------------------------------------------------
// RENDER TABLE
// ----------------------------------------------------------------
function renderTable(shipments) {
    var tbody = document.getElementById('shipmentsBody');
    if (!tbody) return;

    if (shipments.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="11" class="table-empty">' +
            'No shipments match this filter.</td></tr>';
        return;
    }

    var user    = getCurrentUser ? getCurrentUser() : null;
    var isAdmin = user && user.role === 'ADMIN';
    var html    = '';

    shipments.forEach(function (s) {
        var color    = STATUS_COLORS[s.status]     || '#94a3b8';
        var pColor   = PRIORITY_COLORS[s.priority] || '#94a3b8';
        var progress = calcProgress(s);
        var distKm   = calcDistanceKm(s.originLat, s.originLng, s.destLat, s.destLng);
        var mode     = s.transportMode || 'TRUCK';
        var modeIcon = MODE_ICONS[mode] || '🚛';
        var modeClr  = MODE_COLORS[mode] || '#4fc3f7';

        var originCity = s.origin      ? s.origin.split(',')[0]      : '--';
        var destCity   = s.destination ? s.destination.split(',')[0] : '--';
        var etaDate    = s.estimatedDeliveryTime
            ? new Date(s.estimatedDeliveryTime).toLocaleString('en-GB',
                { day:'2-digit', month:'short', hour:'2-digit',
                    minute:'2-digit', hour12:true })
            : 'N/A';
        var driverName = s.assignedDriverName && s.assignedDriverName.trim()
            ? s.assignedDriverName
            : '<em style="color:var(--text-muted)">Unassigned</em>';

        html +=
            '<tr class="table-row" onclick="openShipmentDetail(' + s.id + ')">' +
            '<td><span class="tracking-cell">' + s.trackingId + '</span></td>' +
            '<td>' +
            '<span style="font-size:18px;" title="' + mode + '">' +
            modeIcon + '</span>' +
            '<span style="font-size:9px;color:' + modeClr + ';' +
            'font-weight:700;display:block;">' + mode + '</span>' +
            '</td>' +
            '<td class="text-secondary">' + (s.customerName || '--') + '</td>' +
            '<td class="text-secondary">' + s.cargoType + '</td>' +
            '<td class="route-cell">' +
            '<span class="route-from">' + originCity + '</span>' +
            '<span class="route-arrow">&#8594;</span>' +
            '<span class="route-to">' + destCity + '</span>' +
            '</td>' +
            '<td class="progress-cell">' +
            '<div class="progress-bar-wrap">' +
            '<div class="progress-bar-fill" style="width:' + progress +
            '%;background:' + color + ';"></div>' +
            '</div>' +
            '<span class="progress-pct">' + progress + '%</span>' +
            '</td>' +
            '<td><span class="priority-badge" style="color:' + pColor +
            ';border-color:' + pColor + '44;background:' + pColor + '11;">' +
            (s.priority || 'NORMAL') + '</span>' +
            '</td>' +
            '<td style="font-family:var(--font-mono);font-size:12px;' +
            'color:var(--text-secondary);">' +
            (distKm !== null
                ? distKm.toLocaleString() + ' km'
                : '<em style="color:var(--text-muted)">N/A</em>') +
            '</td>' +
            '<td style="font-size:12px;">' + driverName + '</td>' +
            '<td class="eta-cell">' + etaDate + '</td>' +
            '<td class="actions-cell" onclick="event.stopPropagation()">' +
            (s.status === 'DELAYED'
                ? '<button class="btn-action reroute" ' +
                'onclick="quickReroute(' + s.id + ')">&#128260; Reroute</button>'
                : '') +
            (isAdmin
                ? '<button onclick="quickDelete(' + s.id + ',\'' +
                s.trackingId + '\')" title="Delete" ' +
                'style="margin-left:4px;padding:4px 8px;font-size:14px;' +
                'cursor:pointer;background:rgba(239,68,68,0.1);color:#ef4444;' +
                'border:1px solid rgba(239,68,68,0.3);border-radius:6px;">&#128465;</button>'
                : '') +
            '</td>' +
            '</tr>';
    });

    tbody.innerHTML = html;
}

// ----------------------------------------------------------------
// FILTER & SEARCH
// ----------------------------------------------------------------
function setTableFilter(f, btn) {
    activeFilter = f;
    document.querySelectorAll('.filter-chip').forEach(function (b) {
        b.classList.toggle('active', b.dataset.f === f);
    });
    renderTable(getFiltered());
}

// Change 2: Added setModeTableFilter
function setModeTableFilter(mode) {
    activeModeFilter = mode;
    document.querySelectorAll('.mode-chip').forEach(function (b) {
        b.classList.toggle('active', b.dataset.m === mode);
    });
    renderTable(getFiltered());
}

function filterTable() {
    searchQuery = document.getElementById('searchInput').value;
    renderTable(getFiltered());
}

// ----------------------------------------------------------------
// QUICK REROUTE / DELETE
// ----------------------------------------------------------------
async function quickReroute(id) {
    try {
        var resp = await fetch(API_BASE + '/api/shipments/' + id + '/reroute',
            { method:'POST', headers:{'Content-Type':'application/json'},
                credentials:'include' });
        if (resp.ok) {
            showToast('success', '&#128260; Rerouted', 'Shipment rerouted via alternate corridor');
            await loadShipments();
        }
    } catch (e) { showToast('danger', 'Error', e.message); }
}

async function quickDelete(id, trackingId) {
    if (!confirm('Delete shipment ' + trackingId + '?\nThis cannot be undone.')) return;
    try {
        var resp = await fetch(API_BASE + '/api/shipments/' + id,
            { method:'DELETE', credentials:'include' });
        if (resp.ok) {
            showToast('success', '&#128465; Deleted', trackingId + ' removed.');
            await loadShipments();
        } else {
            var d = await resp.json();
            showToast('danger', 'Delete Failed', d.error || 'Error');
        }
    } catch (e) { showToast('danger', 'Error', e.message); }
}

function openShipmentDetail(id) {
    window.location.href = '/index.html#shipment-' + id;
}

// ================================================================
// CREATE MODAL
// ================================================================

function openCreateModal() {
    document.getElementById('createModal').style.display = 'flex';
    selectedMode = 'TRUCK';

    // Initialize mode selector
    selectTransportMode('TRUCK');

    // Load cargo types
    loadCargoTypes();

    // Load client dropdowns
    loadClientDropdowns();

    hideFormMsg('createError');
    hideFormMsg('createSuccess');
}

function closeCreateModal() {
    document.getElementById('createModal').style.display = 'none';
    var fields = ['mCustomer','mWeight'];
    fields.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
    var etaEl = document.getElementById('mEta');
    if (etaEl) etaEl.value = '5';
}

// ----------------------------------------------------------------
// TRANSPORT MODE SELECTION
// ----------------------------------------------------------------
function selectTransportMode(mode) {
    selectedMode = mode;

    // Update card styles
    document.querySelectorAll('.mode-card').forEach(function (card) {
        card.classList.toggle('active', card.dataset.mode === mode);
    });

    // Update city dropdowns for mode
    if (typeof buildGlobalCityDropdown === 'function') {
        buildGlobalCityDropdown('mOrigin', null, mode);
        buildGlobalCityDropdown('mDest',   null, mode);
    }

    // Update labels based on mode
    var originLabel   = document.getElementById('originLabel');
    var destLabel     = document.getElementById('destLabel');
    var carrierLabel  = document.getElementById('carrierLabel');
    var etaHint       = document.getElementById('mEtaHint');

    var modeConfig = {
        'TRUCK': {
            origin:'&#128204; Origin City *',
            dest:'&#127937; Destination City *',
            carrier:'&#128663; Assign Truck (optional)',
            eta:'Demo: 1-60 min — trucks travel at 30–80 km/h'
        },
        'SHIP': {
            origin:'&#9875; Port of Loading *',
            dest:'&#9875; Port of Discharge *',
            carrier:'&#128674; Assign Vessel (optional)',
            eta:'Demo: 10-300 min — ships travel at 25–45 km/h'
        },
        'PLANE': {
            origin:'&#9992; Departure Airport *',
            dest:'&#9992; Arrival Airport *',
            carrier:'&#128747; Assign Aircraft (optional)',
            eta:'Demo: 5-60 min — planes travel at 800–950 km/h'
        },
        'TRAIN': {
            origin:'&#128646; Origin Station *',
            dest:'&#128646; Destination Station *',
            carrier:'&#128642; Assign Train (optional)',
            eta:'Demo: 5-120 min — trains travel at 80–250 km/h'
        }
    };

    var cfg = modeConfig[mode] || modeConfig['TRUCK'];
    if (originLabel)  originLabel.innerHTML  = cfg.origin;
    if (destLabel)    destLabel.innerHTML    = cfg.dest;
    if (carrierLabel) carrierLabel.innerHTML = cfg.carrier;
    if (etaHint)      etaHint.textContent    = cfg.eta;

    // Update hint text
    var oh = document.getElementById('mOriginHint');
    var dh = document.getElementById('mDestHint');
    if (oh) oh.textContent = '';
    if (dh) dh.textContent = '';

    // Load carriers for this mode
    loadCarriersForMode(mode);
}

// ----------------------------------------------------------------
// City select handler
// ----------------------------------------------------------------
function onGlobalCitySelect(selectId, hintId) {
    var sel  = document.getElementById(selectId);
    var hint = document.getElementById(hintId);
    if (!sel || !hint) return;
    var opt = sel.options[sel.selectedIndex];
    if (opt && opt.dataset.lat) {
        hint.textContent = opt.dataset.lat + '° · ' + opt.dataset.lng + '°' +
            (opt.dataset.country ? ' — ' + opt.dataset.country : '') +
            (opt.dataset.continent ? ' · ' + opt.dataset.continent : '');
    } else {
        hint.textContent = '';
    }
}

// ----------------------------------------------------------------
// LOAD CARRIERS FOR MODE
// ----------------------------------------------------------------
async function loadCarriersForMode(mode) {
    var sel = document.getElementById('mCarrier');
    if (!sel) return;

    sel.innerHTML = '<option value="">-- No carrier --</option>';

    if (mode === 'TRUCK') {
        // Load vehicles (existing system)
        await loadAvailableVehicles();
    } else {
        // Load carriers from new carriers API
        try {
            var [carriersResp, shipmentsResp] = await Promise.all([
                fetch(API_BASE + '/api/carriers?type=' + mode, { credentials:'include' }),
                fetch(API_BASE + '/api/shipments', { credentials:'include' })
            ]);

            var carriers  = carriersResp.ok  ? await carriersResp.json()  : [];
            var shipments = shipmentsResp.ok ? await shipmentsResp.json() : [];

            var busyCarrierIds = new Set();
            shipments.forEach(function (s) {
                if (s.carrierId && s.status !== 'DELIVERED') {
                    busyCarrierIds.add(String(s.carrierId));
                }
            });

            sel.innerHTML = '<option value="">-- No carrier --</option>';

            carriers.forEach(function (c) {
                var isBusy = busyCarrierIds.has(String(c.id));
                var opt    = document.createElement('option');
                opt.value          = 'carrier:' + c.id;
                opt.disabled       = isBusy;

                // Updated line to show partner company name
                opt.textContent = c.identifier +
                    (c.partnerCompanyName ? ' (' + c.partnerCompanyName + ')' : '') +
                    ' — ' + (c.operatorName || 'Unknown') +
                    (isBusy ? ' [IN USE]' : '');

                if (isBusy) opt.style.color = '#475569';
                sel.appendChild(opt);
            });

            if (carriers.length === 0) {
                var placeholder = document.createElement('option');
                placeholder.disabled = true;
                placeholder.textContent = '-- No ' + mode + ' carriers registered yet --';
                sel.appendChild(placeholder);
            }

        } catch (e) {
            console.error('Could not load carriers:', e);
        }
    }
}

// ----------------------------------------------------------------
// LOAD AVAILABLE VEHICLES (for TRUCK mode)
// ----------------------------------------------------------------
async function loadAvailableVehicles() {
    try {
        var [vehiclesResp, shipmentsResp] = await Promise.all([
            fetch(API_BASE + '/api/vehicles',  { credentials:'include' }),
            fetch(API_BASE + '/api/shipments', { credentials:'include' })
        ]);

        var vehicles  = vehiclesResp.ok  ? await vehiclesResp.json()  : [];
        var shipments = shipmentsResp.ok ? await shipmentsResp.json() : [];

        var busyVehicleIds = new Set();
        shipments.forEach(function (s) {
            if (s.vehicleId && s.status !== 'DELIVERED') {
                busyVehicleIds.add(String(s.vehicleId));
            }
        });

        var sel = document.getElementById('mCarrier');
        if (!sel) return;
        sel.innerHTML = '<option value="">-- No truck --</option>';

        vehicles.sort(function (a, b) {
            var aBusy = busyVehicleIds.has(String(a.id));
            var bBusy = busyVehicleIds.has(String(b.id));
            return aBusy === bBusy ? 0 : (aBusy ? 1 : -1);
        });

        vehicles.forEach(function (v) {
            var isBusy = busyVehicleIds.has(String(v.id));
            var opt    = document.createElement('option');
            opt.value          = 'vehicle:' + v.id;
            opt.dataset.driver = v.assignedDriverName || '';
            opt.disabled       = isBusy;
            opt.textContent    = v.registrationNumber +
                ' (' + (v.vehicleType || '').replace(/_/g,' ') + ')' +
                (v.assignedDriverName ? ' — ' + v.assignedDriverName : ' — No driver') +
                (isBusy ? ' [IN USE]' : '');
            if (isBusy) opt.style.color = '#475569';
            sel.appendChild(opt);
        });

    } catch (e) { console.error('Could not load vehicles:', e); }
}

// ----------------------------------------------------------------
// LOAD CARGO TYPES
// ----------------------------------------------------------------
async function loadCargoTypes() {
    try {
        var resp  = await fetch(API_BASE + '/api/cargo-types', { credentials:'include' });
        var types = resp.ok ? await resp.json() : [];
        var el    = document.getElementById('mCargo');
        if (!el) return;
        el.innerHTML = '<option value="">-- Select cargo type --</option>';
        types.forEach(function (t) {
            var opt = document.createElement('option');
            opt.value = t; opt.textContent = t;
            el.appendChild(opt);
        });
    } catch (e) { console.error('loadCargoTypes:', e); }
}

// ----------------------------------------------------------------
// LOAD CLIENT DROPDOWNS
// ----------------------------------------------------------------
async function loadClientDropdowns() {
    try {
        var resp = await fetch(API_BASE + '/api/clients', { credentials:'include' });
        if (!resp.ok) return;
        var clients = await resp.json();

        var senders   = clients.filter(function (c) { return c.clientType === 'SENDER'; });
        var receivers = clients.filter(function (c) { return c.clientType === 'RECEIVER'; });

        var senderSel   = document.getElementById('mSender');
        var receiverSel = document.getElementById('mReceiver');

        if (senderSel) {
            senderSel.innerHTML = '<option value="">-- Select sender --</option>';
            senders.forEach(function (c) {
                var opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.companyName;
                senderSel.appendChild(opt);
            });
        }

        if (receiverSel) {
            receiverSel.innerHTML = '<option value="">-- Select receiver --</option>';
            receivers.forEach(function (c) {
                var opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.companyName;
                receiverSel.appendChild(opt);
            });
        }
    } catch (e) { console.error('loadClientDropdowns:', e); }
}

// ================================================================
// SUBMIT CREATE SHIPMENT
// ================================================================
async function submitCreateShipment() {
    hideFormMsg('createError');

    var customer  = document.getElementById('mCustomer').value.trim();
    var cargoEl   = document.getElementById('mCargo');
    var cargo     = cargoEl ? cargoEl.value.trim() : '';
    var weight    = document.getElementById('mWeight').value;
    var priority  = document.getElementById('mPriority').value;
    var eta       = document.getElementById('mEta').value || '5';
    var senderId  = document.getElementById('mSender')   ? document.getElementById('mSender').value   : '';
    var receiverId= document.getElementById('mReceiver') ? document.getElementById('mReceiver').value : '';

    // Origin / Destination from global city dropdowns
    var originSel = document.getElementById('mOrigin');
    var destSel   = document.getElementById('mDest');
    var originOpt = originSel ? originSel.options[originSel.selectedIndex] : null;
    var destOpt   = destSel   ? destSel.options[destSel.selectedIndex]     : null;

    if (!customer || !cargo) {
        showFormMsg('createError', 'Customer name and cargo type are required.');
        return;
    }
    if (!originOpt || !originOpt.value) {
        showFormMsg('createError', 'Please select an origin.'); return;
    }
    if (!destOpt || !destOpt.value) {
        showFormMsg('createError', 'Please select a destination.'); return;
    }
    if (originOpt.value === destOpt.value) {
        showFormMsg('createError', 'Origin and destination must be different.'); return;
    }

    // Carrier / Vehicle assignment
    var carrierVal     = document.getElementById('mCarrier').value;
    var vehicleId      = null;
    var carrierId      = null;
    var driverName     = '';

    if (carrierVal) {
        if (carrierVal.startsWith('vehicle:')) {
            vehicleId = parseInt(carrierVal.replace('vehicle:', ''));
            var carrierEl = document.getElementById('mCarrier');
            var carrierOpt = carrierEl.options[carrierEl.selectedIndex];
            driverName = carrierOpt ? (carrierOpt.dataset.driver || '') : '';
        } else if (carrierVal.startsWith('carrier:')) {
            carrierId = parseInt(carrierVal.replace('carrier:', ''));
        }
    }

    var payload = {
        customerName:       customer,
        cargoType:          cargo,
        weightKg:           weight ? parseFloat(weight) : 0,
        priority:           priority,
        transportMode:      selectedMode,
        origin:             originOpt.value + ', ' + (originOpt.dataset.country || ''),
        originLat:          parseFloat(originOpt.dataset.lat),
        originLng:          parseFloat(originOpt.dataset.lng),
        destination:        destOpt.value  + ', ' + (destOpt.dataset.country || ''),
        destLat:            parseFloat(destOpt.dataset.lat),
        destLng:            parseFloat(destOpt.dataset.lng),
        etaHours:           parseInt(eta),
        vehicleId:          vehicleId,
        carrierId:          carrierId,
        assignedDriverName: driverName,
        senderId:           senderId    || null,
        receiverId:         receiverId  || null
    };

    var btn = document.getElementById('createSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating...'; }

    try {
        var resp = await fetch(API_BASE + '/api/shipments', {
            method:      'POST',
            headers:     { 'Content-Type': 'application/json' },
            credentials: 'include',
            body:        JSON.stringify(payload)
        });
        var data = await resp.json();

        if (resp.ok || resp.status === 201) {
            var suc = document.getElementById('createSuccess');
            if (suc) {
                suc.textContent = '✓ Shipment ' + data.shipment.trackingId + ' created!';
                suc.style.display = 'block';
            }
            setTimeout(function () {
                closeCreateModal();
                loadShipments();
            }, 1500);
        } else {
            showFormMsg('createError', data.error || 'Failed to create shipment.');
        }
    } catch (e) {
        showFormMsg('createError', 'Network error: ' + e.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '&#128666; Create Shipment';
        }
    }
}

// ----------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------
function showToast(type, title, message) {
    var c = document.getElementById('toastContainer');
    if (!c) return;
    var t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = '<div class="toast-title">' + title + '</div>' +
        '<div class="toast-message">' + message + '</div>';
    c.appendChild(t);
    setTimeout(function () {
        t.style.opacity   = '0';
        t.style.transform = 'translateX(110%)';
        t.style.transition= 'all 0.3s ease';
        setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
    }, 5000);
}

function showFormMsg(id, msg) {
    var el = document.getElementById(id);
    if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function hideFormMsg(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
}