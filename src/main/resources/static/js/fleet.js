// ============================================================
// VSST — fleet.js
// ============================================================

var API_BASE = window.API_BASE || window.location.origin;

var allVehicles        = [];
var allDrivers         = [];
var assigningVehicleId = null;
var assigningDriverId  = null;

document.addEventListener('DOMContentLoaded', function () {
    if (typeof requireAuth === 'function' && !requireAuth()) return;

    var user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if (user) {
        var av = document.getElementById('navAvatar');
        var nm = document.getElementById('navName');
        var rl = document.getElementById('navRole');
        if (av) av.textContent = (user.fullName || user.username).charAt(0).toUpperCase();
        if (nm) nm.textContent = user.fullName || user.username;
        if (rl) {
            rl.textContent = user.role;
            rl.style.color = user.role === 'ADMIN' ? '#ef4444' :
                user.role === 'OPERATOR' ? '#4fc3f7' : '#10b981';
        }
    }

    loadAll();
    setInterval(loadAll, 20000);

    // Initialize on Vehicle Registry tab
    var firstTabBtn = document.querySelector('.page-tab-btn');
    if (firstTabBtn) switchTab('vehicles', firstTabBtn);
});

// ----------------------------------------------------------------
// LOAD ALL DATA (RACE CONDITION FIXED)
// ----------------------------------------------------------------
async function loadAll() {
    // Wait for BOTH vehicles and drivers to finish loading from the server
    await Promise.all([loadVehicles(), loadDrivers()]);

    // ONLY render the UI once we have all the cross-referenced data
    renderVehicleGrid(allVehicles);
    renderDriversTable();
}

// ----------------------------------------------------------------
// FETCH VEHICLES
// ----------------------------------------------------------------
async function loadVehicles() {
    var grid = document.getElementById('vehiclesGrid');
    try {
        var resp = await fetch(API_BASE + '/api/vehicles', { credentials: 'include' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var data = await resp.json();
        allVehicles = Array.isArray(data) ? data : [];
    } catch (e) {
        console.error('Failed to load vehicles:', e);
        if (grid) grid.innerHTML =
            '<p style="color:#ef4444;padding:20px;">Failed to load vehicles: ' + e.message + '</p>';
    }
}

function renderVehicleGrid(vehicles) {
    var grid = document.getElementById('vehiclesGrid');
    if (!grid) return;

    if (vehicles.length === 0) {
        grid.innerHTML =
            '<p style="color:var(--text-muted);font-size:13px;padding:20px;">' +
            'No vehicles registered yet. Click "+ Register Vehicle" above to add one.</p>';
        return;
    }

    var user    = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    var isAdmin = user && user.role === 'ADMIN';
    var html    = '';

    vehicles.forEach(function (v) {
        html +=
            '<div class="vehicle-card ' + v.status + '">' +
            '<div class="vehicle-card-top">' +
            '<span class="vehicle-reg">' + v.registrationNumber + '</span>' +
            '<span class="vehicle-status-badge ' + v.status + '">' +
            v.status.replace(/_/g,' ') +
            '</span>' +
            '</div>' +
            '<div class="vehicle-detail-row"><strong>Type:</strong> ' +
            v.vehicleType.replace(/_/g,' ') + '</div>' +
            '<div class="vehicle-detail-row"><strong>Capacity:</strong> ' +
            (v.capacityTons || '--') + ' tons</div>' +
            '<div class="vehicle-detail-row"><strong>Make:</strong> ' +
            (v.manufacturerName || '--') + ' ' + (v.modelYear || '') + '</div>' +

            '<div class="vehicle-driver-row">' +
            (v.assignedDriverName
                    ?   '<div>' +
                    '<div class="driver-name">&#128100; ' + v.assignedDriverName + '</div>' +
                    '<div style="font-size:11px;color:var(--text-muted);">Assigned driver</div>' +
                    '</div>' +
                    (isAdmin
                        ? '<button class="btn-assign" ' +
                        'style="background:rgba(239,68,68,0.1);color:#ef4444;border-color:rgba(239,68,68,0.3);" ' +
                        'onclick="unassignDriverFromVehicle(' + v.id + ')">&#10005; Remove</button>'
                        : '')
                    :   '<span class="no-driver">No driver assigned</span>' +
                    (isAdmin
                        ? '<button class="btn-assign" ' +
                        'onclick="openAssignDriverToVehicleModal(' + v.id + ',\'' + v.registrationNumber + '\')">' +
                        '&#43; Assign Driver</button>'
                        : '')
            ) +
            '</div>' +

            (isAdmin
                ? '<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border-dim);display:flex;gap:6px;">' +
                '<button onclick="deleteVehicle(' + v.id + ',\'' + v.registrationNumber + '\')" ' +
                'style="padding:4px 12px;font-size:11px;font-weight:600;cursor:pointer;' +
                'background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.3);' +
                'border-radius:6px;font-family:var(--font-main);">&#128465; Delete</button>' +
                '</div>'
                : '') +
            '</div>';
    });

    grid.innerHTML = html;
}

// ----------------------------------------------------------------
// FETCH DRIVERS
// ----------------------------------------------------------------
async function loadDrivers() {
    try {
        var resp = await fetch(API_BASE + '/api/auth/users', { credentials: 'include' });
        if (!resp.ok) return;
        var users  = await resp.json();
        allDrivers = users.filter(function (u) { return u.role === 'DRIVER'; });
    } catch (e) {
        console.error('Failed to load drivers:', e);
    }
}

function renderDriversTable() {
    var tbody = document.getElementById('driversBody');
    if (!tbody) return;

    if (allDrivers.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="5" class="table-empty" style="text-align:center; padding:20px; color:var(--text-muted);">' +
            'No drivers registered. Click "+ Register Driver" to create a driver account.' +
            '</td></tr>';
        return;
    }

    var user    = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    var isAdmin = user && user.role === 'ADMIN';
    var html    = '';

    allDrivers.forEach(function (d) {
        var assignedVehicle = allVehicles.find(function (v) {
            return v.assignedDriverId === d.id;
        });

        html += '<tr class="table-row">';

        // Column 1: Driver (Name & Username)
        html += '<td>' +
            '<div style="font-weight:500; color:var(--text-primary);">' + (d.fullName || '--') + '</div>' +
            '<div style="font-size:11px; color:var(--text-muted);">@' + (d.username || '--') + '</div>' +
            '</td>';

        // Column 2: Contact (Phone & Email)
        html += '<td style="font-size:12px;">' +
            (d.phoneNumber && d.phoneNumber.trim()
                ? '<div style="color:var(--text-primary);">' + d.phoneNumber + '</div>'
                : '') +
            (d.email && d.email.trim()
                ? '<div style="font-size:11px;color:var(--text-muted);">' + d.email + '</div>'
                : '') +
            (!d.phoneNumber && !d.email
                ? '<span style="color:var(--text-muted);">--</span>'
                : '') +
            '</td>';

        // Column 3: Assigned Vehicle (Registration Number Only)
        html += '<td>' +
            (assignedVehicle
                ? '<span style="font-weight:600; font-size:13px; color:var(--text-primary);">' + assignedVehicle.registrationNumber + '</span>'
                : '<span style="color:var(--text-muted); font-size:13px;">No Vehicle</span>') +
            '</td>';

        // Column 4: Vehicle Status (Status Badge Only)
        html += '<td>' +
            (assignedVehicle
                ? '<span class="vehicle-status-badge ' + assignedVehicle.status + '">' + assignedVehicle.status.replace(/_/g,' ') + '</span>'
                : '<span style="color:var(--text-muted);">--</span>') +
            '</td>';

        // Column 5: Action (Assign/Remove Vehicle + Delete Driver)
        html += '<td>' +
            (isAdmin
                ? (assignedVehicle
                        ? '<button onclick="unassignDriverFromVehicle(' + assignedVehicle.id + ')" ' +
                        'style="padding:4px 10px;font-size:11px;font-weight:600;cursor:pointer;' +
                        'background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.3);' +
                        'border-radius:6px;font-family:var(--font-main);margin-right:4px;">Remove</button>'
                        : '<button onclick="openAssignVehicleToDriverModal(' + d.id + ',\'' + d.fullName + '\')" ' +
                        'style="padding:4px 10px;font-size:11px;font-weight:600;cursor:pointer;' +
                        'background:rgba(167,139,250,0.1);color:#a78bfa;border:1px solid rgba(167,139,250,0.3);' +
                        'border-radius:6px;font-family:var(--font-main);margin-right:4px;">Assign Vehicle</button>'
                ) +
                '<button onclick="deleteDriver(' + d.id + ',\'' + d.fullName + '\')" ' +
                'style="padding:4px 8px;font-size:13px;cursor:pointer;' +
                'background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.3);' +
                'border-radius:6px;" title="Delete driver">&#128465;</button>'
                : '--') +
            '</td>';

        html += '</tr>';
    });

    tbody.innerHTML = html;
}

// ----------------------------------------------------------------
// TAB SWITCHING
// ----------------------------------------------------------------
function switchTab(name, btn) {
    document.querySelectorAll('.tab-pane').forEach(function (p) {
        p.classList.remove('active');
    });
    document.querySelectorAll('.page-tab-btn').forEach(function (b) {
        b.classList.remove('active');
    });

    var pane = document.getElementById('tab-' + name);
    if (pane) pane.classList.add('active');
    if (btn)  btn.classList.add('active');

    var user    = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    var isAdmin = user && user.role === 'ADMIN';

    var regVehicleBtn = document.getElementById('regVehicleBtn');
    var regDriverBtn  = document.getElementById('regDriverBtn');

    if (regVehicleBtn) {
        regVehicleBtn.style.display = (name === 'vehicles' && isAdmin) ? 'inline-block' : 'none';
    }
    if (regDriverBtn) {
        regDriverBtn.style.display = (name === 'drivers' && isAdmin) ? 'inline-block' : 'none';
    }

    // Load partner data if the partner tab is selected
    if (name === 'partners') {
        loadPartners();
    }
}

// ----------------------------------------------------------------
// MODAL: Assign Driver TO Vehicle (from Vehicle Registry)
// ----------------------------------------------------------------
function openAssignDriverToVehicleModal(vehicleId, regNumber) {
    assigningVehicleId = vehicleId;

    var regEl = document.getElementById('assignVehicleReg');
    if (regEl) regEl.textContent = regNumber;

    var sel = document.getElementById('assignDriverSelect');
    sel.innerHTML = '<option value="">-- Select a driver --</option>';

    var available = allDrivers.filter(function (d) {
        return !allVehicles.some(function (v) { return v.assignedDriverId === d.id; });
    });

    if (available.length === 0) {
        sel.innerHTML += '<option disabled>All drivers are currently assigned</option>';
    } else {
        available.forEach(function (d) {
            var opt = document.createElement('option');
            opt.value = d.id;
            opt.textContent = d.fullName + ' (@' + d.username + ')';
            sel.appendChild(opt);
        });
    }

    document.getElementById('assignDriverModal').style.display = 'flex';
    hideMsg('assignError');
}

function closeAssignModal() {
    document.getElementById('assignDriverModal').style.display = 'none';
    assigningVehicleId = null;
}

async function submitAssignDriver() {
    var driverId = document.getElementById('assignDriverSelect').value;
    if (!driverId) {
        showMsg('assignError', 'Please select a driver.');
        return;
    }

    var btn = document.getElementById('assignSubmitBtn');
    btn.disabled = true; btn.textContent = 'Assigning...';

    try {
        var resp = await fetch(
            API_BASE + '/api/vehicles/' + assigningVehicleId + '/assign-driver',
            {
                method:      'PUT',
                headers:     { 'Content-Type': 'application/json' },
                credentials: 'include',
                body:        JSON.stringify({ driverId: parseInt(driverId) })
            }
        );
        var data = await resp.json();

        if (resp.ok) {
            showToast('success', '&#128100; Driver Assigned',
                'Driver assigned to vehicle successfully.');
            closeAssignModal();
            loadAll();
        } else {
            showMsg('assignError', data.error || 'Failed to assign driver.');
        }
    } catch (e) {
        showMsg('assignError', 'Network error: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '&#128100; Assign Driver';
    }
}

// ----------------------------------------------------------------
// MODAL: Assign Vehicle TO Driver (from Driver Assignment tab)
// ----------------------------------------------------------------
function openAssignVehicleToDriverModal(driverId, driverName) {
    assigningDriverId = driverId;

    var nameEl = document.getElementById('assignDriverName');
    if (nameEl) nameEl.textContent = driverName;

    var sel = document.getElementById('assignVehicleSelect');
    sel.innerHTML = '<option value="">-- Select a vehicle --</option>';

    var available = allVehicles.filter(function (v) {
        return !v.assignedDriverId;
    });

    if (available.length === 0) {
        sel.innerHTML += '<option disabled>No unassigned vehicles available</option>';
    } else {
        available.forEach(function (v) {
            var opt = document.createElement('option');
            opt.value = v.id;
            opt.textContent = v.registrationNumber + ' (' +
                v.vehicleType.replace(/_/g,' ') + ') — ' +
                (v.capacityTons || '') + ' tons';
            sel.appendChild(opt);
        });
    }

    document.getElementById('assignVehicleToDriverModal').style.display = 'flex';
    hideMsg('vehicleAssignError');
}

function closeAssignVehicleModal() {
    document.getElementById('assignVehicleToDriverModal').style.display = 'none';
    assigningDriverId = null;
}

async function submitAssignVehicleToDriver() {
    var vehicleId = document.getElementById('assignVehicleSelect').value;
    if (!vehicleId) {
        showMsg('vehicleAssignError', 'Please select a vehicle.');
        return;
    }

    var btn = document.getElementById('assignVehicleSubmitBtn');
    btn.disabled = true; btn.textContent = 'Assigning...';

    try {
        var resp = await fetch(
            API_BASE + '/api/vehicles/' + vehicleId + '/assign-driver',
            {
                method:      'PUT',
                headers:     { 'Content-Type': 'application/json' },
                credentials: 'include',
                body:        JSON.stringify({ driverId: parseInt(assigningDriverId) })
            }
        );
        var data = await resp.json();

        if (resp.ok) {
            showToast('success', '&#128663; Vehicle Assigned',
                'Vehicle assigned to driver successfully.');
            closeAssignVehicleModal();
            loadAll();
        } else {
            showMsg('vehicleAssignError', data.error || 'Failed to assign vehicle.');
        }
    } catch (e) {
        showMsg('vehicleAssignError', 'Network error: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '&#128663; Assign Vehicle';
    }
}

// ----------------------------------------------------------------
// UNASSIGN DRIVER
// ----------------------------------------------------------------
async function unassignDriverFromVehicle(vehicleId) {
    if (!confirm('Remove the driver assignment from this vehicle?')) return;

    try {
        var resp = await fetch(
            API_BASE + '/api/vehicles/' + vehicleId + '/unassign-driver',
            { method: 'PUT', credentials: 'include' }
        );
        if (resp.ok) {
            showToast('success', 'Driver Removed', 'Driver unassigned successfully.');
            loadAll();
        } else {
            var data = await resp.json();
            showToast('danger', 'Error', data.error || 'Could not unassign driver.');
        }
    } catch (e) {
        showToast('danger', 'Error', e.message);
    }
}

// ----------------------------------------------------------------
// DELETE VEHICLE
// ----------------------------------------------------------------
async function deleteVehicle(vehicleId, regNumber) {
    if (!confirm('Delete vehicle ' + regNumber + '?\nThis action cannot be undone.')) return;

    try {
        var resp = await fetch(
            API_BASE + '/api/vehicles/' + vehicleId,
            { method: 'DELETE', credentials: 'include' }
        );
        if (resp.ok) {
            showToast('success', '&#128465; Deleted', regNumber + ' removed from fleet.');
            loadAll();
        } else {
            var data = await resp.json();
            showToast('danger', 'Delete Failed', data.error || 'Could not delete vehicle.');
        }
    } catch (e) {
        showToast('danger', 'Error', e.message);
    }
}

// ----------------------------------------------------------------
// REGISTER VEHICLE MODAL
// ----------------------------------------------------------------
function openRegisterModal() {
    document.getElementById('registerVehicleModal').style.display = 'flex';
    document.getElementById('vReg').value      = '';
    document.getElementById('vCapacity').value = '';
    document.getElementById('vYear').value     = '';
    document.getElementById('vMake').value     = '';
    hideMsg('vehicleError');
    hideMsg('vehicleSuccess');
}

function closeRegisterModal() {
    document.getElementById('registerVehicleModal').style.display = 'none';
}

async function submitRegisterVehicle() {
    hideMsg('vehicleError');

    var reg  = document.getElementById('vReg').value.trim().toUpperCase();
    var type = document.getElementById('vType').value;
    var cap  = document.getElementById('vCapacity').value;
    var year = document.getElementById('vYear').value;
    var make = document.getElementById('vMake').value.trim();

    if (!reg || !type) {
        showMsg('vehicleError', 'Registration number and vehicle type are required.');
        return;
    }

    var btn = document.getElementById('regVehicleBtnModal');
    btn.disabled = true; btn.textContent = 'Registering...';

    try {
        var resp = await fetch(API_BASE + '/api/vehicles', {
            method:      'POST',
            headers:     { 'Content-Type': 'application/json' },
            credentials: 'include',
            body:        JSON.stringify({
                registrationNumber: reg,
                vehicleType:        type,
                capacityTons:       cap  ? parseFloat(cap)  : 10,
                modelYear:          year ? parseInt(year)   : 2020,
                manufacturerName:   make
            })
        });
        var data = await resp.json();

        if (resp.ok || resp.status === 201) {
            showMsg('vehicleSuccess', '✓ Vehicle ' + reg + ' registered successfully!');
            setTimeout(function () { closeRegisterModal(); loadAll(); }, 1500);
        } else {
            showMsg('vehicleError', data.error || 'Failed to register vehicle.');
        }
    } catch (e) {
        showMsg('vehicleError', 'Network error: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '&#128663; Register';
    }
}

// ----------------------------------------------------------------
// REGISTER DRIVER MODAL
// ----------------------------------------------------------------
function openRegisterDriverModal() {
    document.getElementById('registerDriverModal').style.display = 'flex';
    ['drFullName','drUsername','drEmail','drPhone','drPassword'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
    hideMsg('driverRegError');
    hideMsg('driverRegSuccess');
}

function closeRegisterDriverModal() {
    document.getElementById('registerDriverModal').style.display = 'none';
}

async function registerDriver() {
    hideMsg('driverRegError');

    var fullName = document.getElementById('drFullName').value.trim();
    var username = document.getElementById('drUsername').value.trim();
    var email    = document.getElementById('drEmail').value.trim();
    var phone    = document.getElementById('drPhone').value.trim();
    var password = document.getElementById('drPassword').value;

    if (!fullName || !username || !email || !password) {
        showMsg('driverRegError', 'All required fields must be filled.');
        return;
    }

    if (password.length < 6) {
        showMsg('driverRegError', 'Password must be at least 6 characters.');
        return;
    }

    var btn = document.getElementById('registerDriverBtnModal');
    btn.disabled = true; btn.textContent = 'Creating...';

    try {
        var resp = await fetch(API_BASE + '/api/auth/register-driver', {
            method:      'POST',
            headers:     { 'Content-Type': 'application/json' },
            credentials: 'include',
            body:        JSON.stringify({
                fullName:    fullName,
                username:    username,
                email:       email,
                password:    password,
                phoneNumber: phone
            })
        });
        var data = await resp.json();

        if (resp.ok || resp.status === 201) {
            showMsg('driverRegSuccess',
                '✓ Driver account created for ' + fullName +
                '. They can login with username: ' + username);
            setTimeout(function () { closeRegisterDriverModal(); loadAll(); }, 2000);
        } else {
            showMsg('driverRegError', data.error || 'Failed to create driver account.');
        }
    } catch (e) {
        showMsg('driverRegError', 'Network error: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '&#128100; Create Driver Account';
    }
}

// ----------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------
function showMsg(id, msg) {
    var el = document.getElementById(id);
    if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function hideMsg(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

function showToast(type, title, message) {
    var c = document.getElementById('toastContainer');
    if (!c) return;
    var t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML =
        '<div class="toast-title">'   + title   + '</div>' +
        '<div class="toast-message">' + message + '</div>';
    c.appendChild(t);
    setTimeout(function () {
        t.style.opacity    = '0';
        t.style.transform  = 'translateX(110%)';
        t.style.transition = 'all 0.3s ease';
        setTimeout(function () {
            if (t.parentNode) t.parentNode.removeChild(t);
        }, 300);
    }, 5000);
}

async function deleteDriver(driverId, fullName) {
    if (!confirm('Delete driver "' + fullName + '"?\n\nThis will remove their account permanently.\nThis cannot be undone.')) return;

    try {
        var resp = await fetch(API_BASE + '/api/auth/users/' + driverId,
            { method: 'DELETE', credentials: 'include' });
        if (resp.ok) {
            showToast('success', '&#128465; Driver Deleted',
                '"' + fullName + '" account removed from system.');
            loadAll();
        } else {
            var data = await resp.json();
            showToast('danger', 'Delete Failed', data.error || 'Could not delete driver.');
        }
    } catch (e) {
        showToast('danger', 'Error', e.message);
    }
}

// ================================================================
// PARTNER COMPANY MANAGEMENT
// ================================================================

var partnerTypeColors = {
    SHIPPING_LINE: '#06b6d4',
    AIRLINE:       '#f0f9ff',
    RAILWAY:       '#f59e0b'
};

var partnerTypeIcons = {
    SHIPPING_LINE: '🚢',
    AIRLINE:       '✈️',
    RAILWAY:       '🚂'
};

// ----------------------------------------------------------------
// Load and render all partners
// ----------------------------------------------------------------
async function loadPartners() {
    try {
        var resp = await fetch(API_BASE + '/api/partners', { credentials: 'include' });
        if (!resp.ok) return;
        var partners = await resp.json();

        var shipping = partners.filter(function(p) { return p.companyType === 'SHIPPING_LINE'; });
        var airlines = partners.filter(function(p) { return p.companyType === 'AIRLINE'; });
        var railways = partners.filter(function(p) { return p.companyType === 'RAILWAY'; });

        renderPartnerGroup('partnerShippingList', shipping, 'SHIPPING_LINE');
        renderPartnerGroup('partnerAirlineList',  airlines, 'AIRLINE');
        renderPartnerGroup('partnerRailwayList',  railways, 'RAILWAY');

    } catch (e) {
        console.error('loadPartners error:', e);
    }
}

// ----------------------------------------------------------------
// Render a group of partners as cards
// ----------------------------------------------------------------
async function renderPartnerGroup(containerId, partners, companyType) {
    var container = document.getElementById(containerId);
    if (!container) return;

    if (partners.length === 0) {
        container.innerHTML =
            '<div style="padding:16px;background:var(--bg-card);border:1px dashed var(--border-dim);' +
            'border-radius:8px;text-align:center;color:var(--text-muted);font-size:13px;">' +
            'No ' + companyType.replace('_', ' ').toLowerCase() +
            ' partners registered yet. Click "Add" above to register one.</div>';
        return;
    }

    var color = partnerTypeColors[companyType] || '#4fc3f7';
    var icon  = partnerTypeIcons[companyType]  || '🏢';
    var html  = '<div style="display:grid;grid-template-columns:repeat(auto-fill,' +
        'minmax(320px,1fr));gap:12px;">';

    var user    = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    var isAdmin = user && user.role === 'ADMIN';

    for (var partner of partners) {
        // Fetch carriers for this partner
        var carriersHtml = '';
        try {
            var cResp = await fetch(API_BASE + '/api/partners/' + partner.id + '/carriers',
                { credentials: 'include' });
            if (cResp.ok) {
                var carriers = await cResp.json();
                if (carriers.length > 0) {
                    carriersHtml =
                        '<div style="margin-top:10px;padding-top:8px;' +
                        'border-top:1px solid var(--border-dim);">' +
                        '<div style="font-size:9px;font-weight:700;color:var(--text-muted);' +
                        'text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">' +
                        'Registered Fleet (' + carriers.length + ')</div>' +
                        '<div style="display:flex;flex-direction:column;gap:5px;">' +
                        carriers.map(function(c) {
                            var statusColor = c.status === 'AVAILABLE' ? '#10b981' :
                                c.status === 'IN_USE'    ? '#4fc3f7' : '#f59e0b';
                            return '<div style="display:flex;align-items:center;' +
                                'justify-content:space-between;padding:4px 8px;border-radius:6px;' +
                                'background:' + statusColor + '0f;border:1px solid ' + statusColor + '25;">' +
                                '<div style="display:flex;align-items:center;gap:8px;">' +
                                '<span style="font-size:11px;font-family:monospace;font-weight:700;' +
                                'color:' + statusColor + ';">' + c.identifier + '</span>' +
                                '<span style="font-size:10px;padding:1px 6px;border-radius:4px;' +
                                'background:' + statusColor + '18;color:' + statusColor + ';' +
                                'border:1px solid ' + statusColor + '30;">' + c.status + '</span>' +
                                (c.capacityTons && c.capacityTons > 0
                                    ? '<span style="font-size:10px;color:var(--text-muted);">' +
                                    c.capacityTons.toLocaleString() + ' t</span>'
                                    : '') +
                                '</div>' +
                                (isAdmin
                                    ? '<button onclick="deleteCarrierFromPartner(' + c.id +
                                    ', \'' + c.identifier + '\', event)" ' +
                                    'style="padding:2px 8px;font-size:11px;cursor:pointer;' +
                                    'background:rgba(239,68,68,0.08);color:#ef4444;' +
                                    'border:1px solid rgba(239,68,68,0.2);border-radius:4px;' +
                                    'font-family:inherit;" title="Remove this carrier">🗑</button>'
                                    : '') +
                                '</div>';
                        }).join('') +
                        '</div></div>';
                }
            }
        } catch(e) {}

        html +=
            '<div style="background:var(--bg-card);border:1px solid var(--border-dim);' +
            'border-radius:10px;padding:16px;position:relative;overflow:hidden;">' +

            '<div style="position:absolute;top:0;left:0;right:0;height:3px;' +
            'background:' + color + ';"></div>' +

            '<div style="display:flex;align-items:flex-start;justify-content:space-between;' +
            'margin-bottom:10px;">' +
            '<div>' +
            '<div style="font-size:15px;font-weight:700;color:var(--text-primary);">' +
            icon + ' ' + partner.name + '</div>' +
            '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">' +
            (partner.country || '') +
            (partner.website ? ' · <a href="' + partner.website +
                '" target="_blank" style="color:var(--accent-blue);">' +
                'Website</a>' : '') +
            '</div>' +
            '</div>' +
            '<div style="display:flex;gap:5px;">' +
            '<button onclick="openAddCarrierToPartnerModal(' + partner.id +
            ', \'' + companyType + '\')" ' +
            'style="padding:4px 9px;font-size:11px;font-weight:600;cursor:pointer;' +
            'background:rgba(79,195,247,0.1);color:#4fc3f7;' +
            'border:1px solid rgba(79,195,247,0.3);border-radius:5px;" ' +
            'title="Add carrier">+ Add</button>' +
            (isAdmin ? '<button onclick="openPartnerUserModal(' + partner.id + ')" ' +
                'style="padding:4px 9px;font-size:11px;font-weight:600;cursor:pointer;' +
                'background:rgba(167,139,250,0.1);color:#a78bfa;' +
                'border:1px solid rgba(167,139,250,0.3);border-radius:5px;" ' +
                'title="Create partner login">👤</button>' : '') +
            (isAdmin ? '<button onclick="deletePartner(' + partner.id +
                ', \'' + partner.name + '\')" ' +
                'style="padding:4px 7px;font-size:12px;cursor:pointer;' +
                'background:rgba(239,68,68,0.08);color:#ef4444;' +
                'border:1px solid rgba(239,68,68,0.2);border-radius:5px;">🗑</button>' : '') +
            '</div>' +
            '</div>' +

            (partner.contactEmail
                ? '<div style="font-size:11px;color:var(--text-secondary);">✉ ' +
                partner.contactEmail + '</div>' : '') +
            (partner.description
                ? '<div style="font-size:11px;color:var(--text-muted);margin-top:4px;' +
                'font-style:italic;">' + partner.description + '</div>' : '') +

            carriersHtml +
            '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
}

// ----------------------------------------------------------------
// ADD PARTNER MODAL
// ----------------------------------------------------------------
function openAddPartnerModal(type) {
    document.getElementById('partnerTypeField').value = type;
    var icons = { SHIPPING_LINE:'🚢', AIRLINE:'✈️', RAILWAY:'🚂' };
    var labels = { SHIPPING_LINE:'Shipping Line', AIRLINE:'Airline (Cargo)', RAILWAY:'Railway' };
    var titleEl = document.getElementById('addPartnerModalTitle');
    if (titleEl) titleEl.textContent = '➕ Add ' + labels[type];

    // Update placeholder based on type
    var nameInput = document.getElementById('partnerName');
    if (nameInput) {
        nameInput.placeholder = type === 'SHIPPING_LINE' ? 'e.g. Maersk Line, MSC, Evergreen' :
            type === 'AIRLINE' ? 'e.g. Emirates SkyCargo, FedEx Express' :
                'e.g. Deutsche Bahn Cargo, Amtrak Freight';
    }

    document.getElementById('addPartnerModal').style.display = 'flex';
}

function closeAddPartnerModal() {
    document.getElementById('addPartnerModal').style.display = 'none';
    ['partnerName','partnerCountry','partnerEmail',
        'partnerPhone','partnerWebsite','partnerDescription'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
}

async function submitAddPartner() {
    var name = document.getElementById('partnerName').value.trim();
    if (!name) { showToast('warning', 'Required', 'Company name is required'); return; }

    var btn = document.querySelector('#addPartnerModal .btn-modal-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'Adding...'; }

    try {
        var resp = await fetch(API_BASE + '/api/partners', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                name:          name,
                companyType:   document.getElementById('partnerTypeField').value,
                country:       document.getElementById('partnerCountry').value.trim(),
                contactEmail:  document.getElementById('partnerEmail').value.trim(),
                contactPhone:  document.getElementById('partnerPhone').value.trim(),
                website:       document.getElementById('partnerWebsite').value.trim(),
                description:   document.getElementById('partnerDescription').value.trim()
            })
        });
        var data = await resp.json();
        if (resp.ok || resp.status === 201) {
            showToast('success', '✅ Partner Added', data.message || name + ' registered');
            closeAddPartnerModal();
            loadPartners();
        } else {
            showToast('danger', 'Failed', data.error || 'Could not add partner');
        }
    } catch (e) {
        showToast('danger', 'Error', e.message);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Add Partner'; }
    }
}

// ----------------------------------------------------------------
// ADD CARRIER TO PARTNER MODAL
// ----------------------------------------------------------------
var currentTargetPartnerId = null;

function openAddCarrierToPartnerModal(partnerId, companyType) {
    currentTargetPartnerId = partnerId;
    document.getElementById('targetPartnerId').value = partnerId;

    var labelEl = document.getElementById('carrierIdentifierLabel');
    if (labelEl) {
        labelEl.textContent = companyType === 'AIRLINE' ? 'ICAO Code / Registration *' :
            companyType === 'RAILWAY' ? 'Train Number / Locomotive ID *' :
                'IMO Number / Vessel Name *';
    }
    var identInput = document.getElementById('carrierIdentifier');
    if (identInput) {
        identInput.placeholder = companyType === 'AIRLINE' ? 'e.g. EK or A6-EDF' :
            companyType === 'RAILWAY' ? 'e.g. TRAIN-001 or DB-V3200' :
                'e.g. IMO9321483 or MAERSK EMMA';
    }
    document.getElementById('addCarrierToPartnerModal').style.display = 'flex';
}

function closeAddCarrierToPartnerModal() {
    document.getElementById('addCarrierToPartnerModal').style.display = 'none';
    ['carrierIdentifier','carrierDisplayName','carrierCapacity'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
    currentTargetPartnerId = null;
}

async function submitAddCarrierToPartner() {
    if (!currentTargetPartnerId) return;
    var identifier = document.getElementById('carrierIdentifier').value.trim();
    if (!identifier) {
        showToast('warning', 'Required', 'Carrier identifier is required');
        return;
    }

    var btn = document.querySelector('#addCarrierToPartnerModal .btn-modal-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'Adding...'; }

    try {
        var resp = await fetch(
            API_BASE + '/api/partners/' + currentTargetPartnerId + '/carriers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    identifier:  identifier.toUpperCase(),
                    capacityTons: document.getElementById('carrierCapacity').value || 0
                })
            });
        var data = await resp.json();
        if (resp.ok || resp.status === 201) {
            showToast('success', '✅ Added to Fleet', data.message || identifier + ' added');
            closeAddCarrierToPartnerModal();
            loadPartners();
        } else {
            showToast('danger', 'Failed', data.error || 'Could not add carrier');
        }
    } catch (e) {
        showToast('danger', 'Error', e.message);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Add to Fleet'; }
    }
}

// ----------------------------------------------------------------
// PARTNER USER MODAL
// ----------------------------------------------------------------
function openPartnerUserModal(companyId) {
    document.getElementById('partnerUserCompanyId').value = companyId;
    document.getElementById('partnerUserModal').style.display = 'flex';
}

function closePartnerUserModal() {
    document.getElementById('partnerUserModal').style.display = 'none';
    ['partnerUserFullName','partnerUserUsername',
        'partnerUserPassword','partnerUserEmail'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
}

async function submitPartnerUser() {
    var companyId = document.getElementById('partnerUserCompanyId').value;
    var fullName  = document.getElementById('partnerUserFullName').value.trim();
    var username  = document.getElementById('partnerUserUsername').value.trim();
    var password  = document.getElementById('partnerUserPassword').value;
    var email     = document.getElementById('partnerUserEmail').value.trim();

    if (!fullName || !username || !password) {
        showToast('warning', 'Required', 'Full name, username, and password are required');
        return;
    }
    if (password.length < 6) {
        showToast('warning', 'Password', 'Password must be at least 6 characters');
        return;
    }

    var btn = document.querySelector('#partnerUserModal .btn-modal-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating...'; }

    try {
        var resp = await fetch(API_BASE + '/api/auth/register-partner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                fullName:         fullName,
                username:         username,
                password:         password,
                email:            email,
                partnerCompanyId: companyId
            })
        });
        var data = await resp.json();
        if (resp.ok || resp.status === 201) {
            showToast('success', '✅ Login Created',
                username + ' can now log in as a partner user');
            closePartnerUserModal();
        } else {
            showToast('danger', 'Failed', data.error || 'Could not create account');
        }
    } catch (e) {
        showToast('danger', 'Error', e.message);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Create Login'; }
    }
}

// ----------------------------------------------------------------
// DELETE PARTNER
// ----------------------------------------------------------------
async function deletePartner(id, name) {
    if (!confirm('Remove partner "' + name + '"?\n\nThis will unlink all their carriers.')) return;
    try {
        var resp = await fetch(API_BASE + '/api/partners/' + id,
            { method: 'DELETE', credentials: 'include' });
        if (resp.ok) {
            showToast('success', '🗑 Removed', name + ' partnership ended');
            loadPartners();
        } else {
            var data = await resp.json();
            showToast('danger', 'Failed', data.error || 'Could not remove partner');
        }
    } catch (e) {
        showToast('danger', 'Error', e.message);
    }
}

// ----------------------------------------------------------------
// DELETE INDIVIDUAL CARRIER FROM PARTNER
// ----------------------------------------------------------------
async function deleteCarrierFromPartner(carrierId, identifier, event) {
    // Prevent the click from bubbling to parent elements
    if (event) event.stopPropagation();

    if (!confirm('Remove carrier "' + identifier + '" from this partner\'s fleet?\n\n' +
        'Any active shipments using this carrier will not be affected.')) return;

    try {
        var resp = await fetch(API_BASE + '/api/carriers/' + carrierId, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (resp.ok) {
            showToast('success', '🗑 Carrier Removed',
                identifier + ' removed from partner fleet');
            loadPartners(); // Refresh the partner list
        } else {
            var data = await resp.json();
            showToast('danger', 'Failed', data.error || 'Could not remove carrier');
        }
    } catch (e) {
        showToast('danger', 'Error', e.message);
    }
}