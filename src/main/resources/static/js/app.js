// ============================================================
// VSST — app.js  (Rebranded Version)
// ============================================================

var API_BASE = window.API_BASE || window.location.origin;
var LOCAL_API_URL = 'http://localhost:9090';
var PROD_API_URL  = 'https://your-app-name.onrender.com';


// ----------------------------------------------------------------
// GLOBAL STATE
// ----------------------------------------------------------------
var map                  = null;
var activeMarkersLayer   = [];
var selectedShipmentId   = null;
var allShipments         = [];
var autoRefreshInterval  = null;
var activeFilter         = 'ALL';
var activeModeFilter     = 'ALL'; // ALL | TRUCK | SHIP | PLANE | TRAIN
var donutChartInstance   = null;
var barChartInstance     = null;
var lineChartInstance    = null;
var disruptionHistory    = [];
var disruptionTimestamps = [];

var STATUS_COLORS = {
    'IN_TRANSIT': '#4fc3f7',
    'DELAYED':    '#ef4444',
    'REROUTED':   '#a78bfa',
    'DELIVERED':  '#10b981'
};

var STATUS_LABELS = {
    'IN_TRANSIT': 'In Transit',
    'DELAYED':    'Delayed',
    'REROUTED':   'Rerouted',
    'DELIVERED':  'Delivered'
};

// ----------------------------------------------------------------
// ETA FORMATTING
// ----------------------------------------------------------------
function formatEtaDisplay(s) {
    // Use realistic hours input for display if available
    if (s.etaHoursInput && s.dispatchTime) {
        var dispatch = new Date(s.dispatchTime);
        var realistic = new Date(dispatch.getTime() +
            s.etaHoursInput * 3600000);
        var fmt = realistic.toLocaleString('en-IN', {
            day:    '2-digit', month: 'short', year: 'numeric',
            hour:   '2-digit', minute: '2-digit', hour12: true
        });
        return fmt;
    }
    // Fallback to stored ETA
    if (s.estimatedDeliveryTime) {
        return new Date(s.estimatedDeliveryTime).toLocaleString('en-IN', {
            day:    '2-digit', month: 'short', year: 'numeric',
            hour:   '2-digit', minute: '2-digit', hour12: true
        });
    }
    return '--';
}

// ----------------------------------------------------------------
// INJECT CSS
// ----------------------------------------------------------------
(function injectModeFilterCSS() {
    if (document.getElementById('modeFilterCSS')) return;
    var st   = document.createElement('style');
    st.id    = 'modeFilterCSS';
    st.textContent =
        '.mode-filter-btn{display:inline-flex;align-items:center;gap:3px;' +
        'padding:3px 7px;font-size:10px;font-weight:600;cursor:pointer;' +
        'border:1px solid var(--border-dim);border-radius:10px;' +
        'background:transparent;color:var(--text-muted);' +
        'font-family:var(--font-main);transition:all 0.2s;}' +
        '.mode-filter-btn:hover{background:var(--bg-card);color:var(--text-secondary);}' +
        '.mode-filter-btn.active{background:rgba(79,195,247,0.1);' +
        'color:var(--accent-blue);border-color:rgba(79,195,247,0.3);}';
    document.head.appendChild(st);
})();

// ----------------------------------------------------------------
// ENTRY POINT
// ----------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
    console.log('%c VSST Control Tower ', 'background:#0d0d26;color:#4fc3f7;font-weight:bold;font-size:13px;padding:4px 8px;');

    if (typeof requireAuth === 'function' && !requireAuth()) return;

    var currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if (currentUser) {
        var avatarEl = document.getElementById('userAvatar');
        var nameEl   = document.getElementById('userNameText');
        var roleEl   = document.getElementById('userRoleText');
        if (avatarEl) avatarEl.textContent = (currentUser.fullName || currentUser.username).charAt(0).toUpperCase();
        if (nameEl)   nameEl.textContent   = currentUser.fullName || currentUser.username;
        if (roleEl) {
            roleEl.textContent = currentUser.role;
            roleEl.style.color = typeof getRoleColor === 'function' ? getRoleColor(currentUser.role) : '#4fc3f7';
        }
    }

    initClock();
    initMap();
    initAllCharts();
    injectFilterBar();
    loadShipments();
    wireButtons();
    startAutoRefresh();
});

// ----------------------------------------------------------------
// CLOCK
// ----------------------------------------------------------------
function initClock() {
    function tick() {
        var el = document.getElementById('currentTime');
        if (el) el.textContent = new Date().toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });
    }
    setInterval(tick, 1000);
    tick();
}

// ----------------------------------------------------------------
// AUTO REFRESH
// ----------------------------------------------------------------
function startAutoRefresh() {
    autoRefreshInterval = setInterval(function () {
        loadShipments();
    }, 15000);
}

// ----------------------------------------------------------------
// MAP INIT
// ----------------------------------------------------------------
function initMap() {
    // Default map center changed to World View
    map = L.map('map', { center: [20, 20], zoom: 2, zoomControl: true });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd', maxZoom: 19
    }).addTo(map);
    console.log('Map initialised.');
}

// ----------------------------------------------------------------
// LOAD SHIPMENTS
// ----------------------------------------------------------------
async function loadShipments() {
    try {
        var response = await fetch(API_BASE + '/api/shipments', { credentials: 'include' });
        if (!response.ok) throw new Error('Status ' + response.status);
        var shipments = await response.json();
        allShipments  = shipments;

        // 1. Update Global KPI and Analytics charts with ALL data
        updateKpiCards(allShipments);
        renderAnalytics(allShipments);

        // 2. Apply Filters (This now handles both the Sidebar AND Map)
        applyFilterAndRender(allShipments);

        loadAnomalyHistory();
    } catch (error) {
        console.error('Failed to load shipments:', error);
        var listEl = document.getElementById('shipmentList');
        if (listEl) listEl.innerHTML =
            '<div class="loading-state"><p style="color:#ef4444;">&#9888; Could not connect to API.<br>' +
            error.message + '</p></div>';
    }
}

// ----------------------------------------------------------------
// FILTER BAR
// ----------------------------------------------------------------
function injectFilterBar() {
    var sidebar = document.getElementById('sidebar');
    var list    = document.getElementById('shipmentList');
    if (!sidebar || !list || document.getElementById('filterBar')) return;

    var bar = document.createElement('div');
    bar.className = 'filter-bar';
    bar.id        = 'filterBar';
    sidebar.insertBefore(bar, list);
    renderFilterBar();
}

function renderFilterBar() {
    var filterBar = document.getElementById('filterBar');
    if (!filterBar) return;

    var statusButtons = [
        { val:'ALL',        label:'All' },
        { val:'IN_TRANSIT', label:'Transit' },
        { val:'DELAYED',    label:'Delayed' },
        { val:'REROUTED',   label:'Rerouted' },
        { val:'DELIVERED',  label:'Delivered' }
    ];

    var modeButtons = [
        { val:'ALL',   icon:'🌐' },
        { val:'TRUCK', icon:'🚛' },
        { val:'SHIP',  icon:'🚢' },
        { val:'PLANE', icon:'✈️' },
        { val:'TRAIN', icon:'🚂' }
    ];

    filterBar.innerHTML =
        '<div style="display:flex;gap:3px;flex-wrap:wrap;margin-bottom:4px;">' +
        statusButtons.map(function(f) {
            return '<button class="filter-btn' +
                (activeFilter === f.val ? ' active' : '') + '" ' +
                'onclick="setFilter(\'' + f.val + '\')">' + f.label + '</button>';
        }).join('') + '</div>' +
        '<div style="display:flex;gap:3px;flex-wrap:wrap;">' +
        modeButtons.map(function(m) {
            return '<button class="mode-filter-btn' +
                (activeModeFilter === m.val ? ' active' : '') + '" ' +
                'onclick="setModeFilter(\'' + m.val + '\')">' + m.icon + '</button>';
        }).join('') + '</div>';
}

function setFilter(status) {
    activeFilter = status;
    renderFilterBar();
    applyFilterAndRender(allShipments);
}

function setModeFilter(mode) {
    activeModeFilter = mode;
    renderFilterBar();
    applyFilterAndRender(allShipments);
}

function applyFilterAndRender(shipments) {
    var filtered = shipments.filter(function (s) {
        // Status filter
        var statusMatch = activeFilter === 'ALL' || s.status === activeFilter;
        // Mode filter
        var modeMatch   = activeModeFilter === 'ALL' ||
            (s.transportMode || 'TRUCK') === activeModeFilter;
        return statusMatch && modeMatch;
    });

    // Update Sidebar List
    renderSidebar(filtered);

    // Update Map Routes & Markers to mirror the filter
    renderMapMarkers(filtered);
}

// ----------------------------------------------------------------
// RENDER SIDEBAR
// ----------------------------------------------------------------
function renderSidebar(shipments) {
    var listEl  = document.getElementById('shipmentList');
    var countEl = document.getElementById('shipmentCount');
    if (countEl) countEl.textContent = allShipments.length;
    if (!listEl) return;

    if (shipments.length === 0) {
        listEl.innerHTML = '<div class="empty-state"><p>No shipments match this filter.</p></div>';
        return;
    }

    var html = '';
    shipments.forEach(function (s) {
        var isDelayed = s.status === 'DELAYED';
        html +=
            '<div class="shipment-card ' + s.status + '" id="card-' + s.id + '" onclick="selectShipment(' + s.id + ')">' +
            '<div class="shipment-card-top">' +
            '<span class="tracking-id">' + s.trackingId + '</span>' +
            // Added mode icon to card header
            '<span style="font-size:14px;margin-left:4px;" title="' + (s.transportMode||'TRUCK') + '">' +
            ({ TRUCK:'🚛',SHIP:'🚢',PLANE:'✈️',TRAIN:'🚂' }[s.transportMode] || '🚛') +
            '</span>' +
            '<span style="margin-left:auto" class="status-badge ' + s.status + '">' + (STATUS_LABELS[s.status] || s.status) + '</span>' +
            '</div>' +
            '<div class="shipment-card-body">' +
            '<p><strong>Cargo:</strong> ' + s.cargoType + '</p>' +
            '<p><strong>From:</strong> '  + s.origin    + '</p>' +
            '<p><strong>To:</strong> '    + s.destination + '</p>' +
            '</div>';

        if (isDelayed) {
            html +=
                '<div class="reroute-action" onclick="event.stopPropagation()">' +
                '<div class="disruption-banner"><span class="disruption-icon">&#9889;</span><span>Active disruption on route</span></div>' +
                '<button class="btn btn-reroute" id="reroute-btn-' + s.id + '" onclick="calculateReroute(' + s.id + ',\'' + s.trackingId + '\')">' +
                '&#128260; Calculate Reroute</button>' +
                '</div>';
        }
        html += '</div>';
    });
    listEl.innerHTML = html;
}

// ----------------------------------------------------------------
// MAP MARKERS
// ----------------------------------------------------------------
function renderMapMarkers(shipments) {
    // Remove old route layers
    activeMarkersLayer.forEach(function (m) { map.removeLayer(m); });
    activeMarkersLayer = [];

    shipments.forEach(function (s) {
        if (!s.originLat || !s.destLat) return;

        var isRerouted  = s.status === 'REROUTED';
        var isDelivered = s.status === 'DELIVERED';
        var mode        = s.status === 'REROUTED' ? null : (s.transportMode || 'TRUCK');

        // Color logic
        var baseColor = mode === 'SHIP'  ? '#06b6d4' :
            mode === 'PLANE' ? '#f0f9ff' :
                mode === 'TRAIN' ? '#f59e0b' : '#4fc3f7';
        var routeColor  = isRerouted  ? '#a78bfa' :
            isDelivered ? '#10b981' : baseColor;
        var routeOpacity = isDelivered ? 0.2 : (isRerouted ? 0.7 : 0.45);

        // Render lines based on mode
        if (mode === 'PLANE') {
            // Planes fly in straight (or geodesic) lines
            drawCurvedLine(s, routeColor, routeOpacity, isRerouted);
        } else if (s.routeGeometry && s.routeGeometry.length > 10) {
            // Trucks, Trains, and Ships use exact path geometry if available
            try {
                var coords = JSON.parse(s.routeGeometry);
                if (coords && coords.length > 1) {
                    var line = L.polyline(coords, {
                        color:     routeColor,
                        weight:    isRerouted ? 3.5 : 2.5,
                        opacity:   routeOpacity,
                        dashArray: isRerouted ? '10,5' : null,
                        lineJoin:  'round',
                        lineCap:   'round'
                    }).addTo(map);

                    line.bindPopup(
                        '<div style="font-family:Inter,sans-serif;font-size:12px;">' +
                        '<b style="color:' + routeColor + '">' +
                        (isRerouted ? '🔄 Rerouted via alternate corridor' : '🛣 Route: ') +
                        '</b><br>' +
                        (s.origin      ? s.origin.split(',')[0]      : '') + ' → ' +
                        (s.destination ? s.destination.split(',')[0] : '') +
                        '</div>'
                    );
                    activeMarkersLayer.push(line);
                }
            } catch (e) {
                drawStraightLine(s, routeColor, routeOpacity, isRerouted);
            }
        } else {
            // Fallback if no geometry
            drawStraightLine(s, routeColor, routeOpacity, isRerouted);
        }

        // Origin dot
        activeMarkersLayer.push(
            L.circleMarker([s.originLat, s.originLng], {
                radius: 4, color: routeColor,
                fillColor: routeColor, fillOpacity: 0.6, weight: 1.5
            }).addTo(map)
        );

        // Destination diamond
        activeMarkersLayer.push(
            L.circleMarker([s.destLat, s.destLng], {
                radius: 5, color: '#fff',
                fillColor: routeColor, fillOpacity: 0.9, weight: 2
            }).addTo(map)
        );
    });

    if (typeof notifyTrackingUpdate === 'function') {
        notifyTrackingUpdate(shipments, map);
    }
}

function drawStraightLine(s, color, opacity, isDashed) {
    var line = L.polyline(
        [[s.originLat, s.originLng], [s.destLat, s.destLng]],
        {
            color:     color,
            weight:    2,
            opacity:   opacity,
            dashArray: isDashed ? '10,5' : '6,5'
        }
    ).addTo(map);
    activeMarkersLayer.push(line);
}

// Helper: draw simple curved line for flights
function drawCurvedLine(s, color, opacity, isDashed) {
    var latlngs = [];
    var offsetX = (s.destLng - s.originLng) * 0.2; // slight curve offset
    var offsetY = (s.destLat - s.originLat) * 0.2;

    var midLat = (s.originLat + s.destLat) / 2 + offsetY;
    var midLng = (s.originLng + s.destLng) / 2 - offsetX;

    // Create a simple 3-point curve (quadratic bezier approximation)
    for (var t = 0; t <= 1; t += 0.1) {
        var lat = (1-t)*(1-t)*s.originLat + 2*(1-t)*t*midLat + t*t*s.destLat;
        var lng = (1-t)*(1-t)*s.originLng + 2*(1-t)*t*midLng + t*t*s.destLng;
        latlngs.push([lat, lng]);
    }

    // Guarantee it hits the exact destination at the end
    latlngs.push([s.destLat, s.destLng]);

    var line = L.polyline(latlngs, {
        color:     color,
        weight:    2,
        opacity:   opacity,
        dashArray: isDashed ? '10,5' : '6,5'
    }).addTo(map);
    activeMarkersLayer.push(line);
}

// ----------------------------------------------------------------
// FETCH WEATHER FOR POPUP
// ----------------------------------------------------------------
async function fetchWeatherForPopup(shipmentId, lat, lng) {
    try {
        var resp = await fetch(API_BASE + '/api/weather/' + lat + '/' + lng, { credentials: 'include' });
        if (!resp.ok) return;
        var w  = await resp.json();
        var el = document.getElementById('wpop-' + shipmentId);
        if (el) {
            var wColor = w.severity === 'HIGH' ? '#ef4444' : w.severity === 'MEDIUM' ? '#f59e0b' : '#10b981';
            el.innerHTML = (w.icon || '🌤') + ' ' + (w.description || w.main || 'N/A') +
                ' · ' + (w.temp ? w.temp.toFixed(1) + '°C' : '--') +
                ' · Wind: ' + (w.wind_speed ? w.wind_speed.toFixed(1) + ' km/h' : '--');
            el.style.color = wColor;
        }
    } catch (e) {
        console.warn('Weather fetch failed:', e);
    }
}

// ----------------------------------------------------------------
// SELECT SHIPMENT — detail panel with milestones + weather
// ----------------------------------------------------------------
async function selectShipment(id) {
    document.querySelectorAll('.shipment-card').forEach(function (c) { c.classList.remove('active'); });
    var card = document.getElementById('card-' + id);
    if (card) { card.classList.add('active'); card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }

    selectedShipmentId = id;
    document.getElementById('detailPanel').classList.add('open');
    document.getElementById('panelBody').innerHTML = '<div class="loading-state"><p>Loading details...</p></div>';
    document.getElementById('panelActions').style.display = 'none';

    try {
        var response = await fetch(API_BASE + '/api/shipments/' + id, { credentials: 'include' });
        if (!response.ok) throw new Error('Status ' + response.status);
        var data      = await response.json();
        var s         = data.shipment;
        var anomalies = data.anomalies || [];
        var color     = STATUS_COLORS[s.status] || '#94a3b8';

        var dispatchDate = s.dispatchTime ? new Date(s.dispatchTime).toLocaleString('en-IN') : 'N/A';
        var etaDate      = formatEtaDisplay(s);

        var html =
            '<div class="detail-group"><div class="detail-label">Tracking ID</div>' +
            '<div class="detail-value" style="color:' + color + '">' + s.trackingId + '</div></div>' +
            '<div class="detail-group"><div class="detail-label">Status</div>' +
            '<div><span class="status-badge ' + s.status + '">' + (STATUS_LABELS[s.status] || s.status) + '</span></div></div>' +
            '<div class="detail-group"><div class="detail-label">Cargo</div>' +
            '<div class="detail-value">' + s.cargoType + '</div></div>' +
            (s.customerName ? '<div class="detail-group"><div class="detail-label">Customer</div><div class="detail-value">' + s.customerName + '</div></div>' : '') +
            (s.weightKg > 0 ? '<div class="detail-group"><div class="detail-label">Weight</div><div class="detail-value">' + s.weightKg.toLocaleString() + ' kg</div></div>' : '') +
            '<div class="detail-divider"></div>' +
            '<div class="detail-group"><div class="detail-label">Origin</div><div class="detail-value">' + s.origin + '</div></div>' +
            '<div class="detail-group"><div class="detail-label">Destination</div><div class="detail-value">' + s.destination + '</div></div>' +
            '<div class="detail-group"><div class="detail-label">Current Position</div>' +
            '<div class="detail-value">' + s.currentLat.toFixed(4) + '°N, ' + s.currentLng.toFixed(4) + '°E</div></div>' +
            '<div class="detail-divider"></div>' +
            '<div class="detail-group"><div class="detail-label">Dispatched</div><div class="detail-value">' + dispatchDate + '</div></div>' +
            '<div class="detail-group"><div class="detail-label">Estimated Delivery</div>' +
            '<div class="detail-value" style="color:' + color + '">' + etaDate + '</div></div>';

        if (anomalies.length > 0) {
            html += '<div class="detail-divider"></div><div class="detail-label" style="margin-bottom:8px;">&#9888; Active Anomalies</div>';
            anomalies.forEach(function (a) {
                html += '<div class="anomaly-card"><div class="anomaly-severity">&#128308; ' + a.severity + ' SEVERITY</div>' +
                    '<div class="anomaly-desc">' + a.description + '</div></div>';
            });
        } else {
            html += '<div class="detail-divider"></div><div class="detail-label">Anomalies</div>' +
                '<div class="detail-value" style="color:#10b981;font-size:12px;margin-top:4px;">&#9989; No active anomalies</div>';
        }

        // Placeholder for weather (loads async below)
        html += '<div class="detail-divider"></div>' +
            '<div class="detail-label" style="margin-bottom:8px;">&#127777; Current Weather</div>' +
            '<div id="weatherDetail" style="font-size:13px;color:var(--text-muted);">Loading weather data...</div>';

        // Milestones
        try {
            var mResp = await fetch(API_BASE + '/api/shipments/' + id + '/milestones', { credentials: 'include' });
            if (mResp.ok) {
                var milestones = await mResp.json();
                if (milestones && milestones.length > 0) {
                    html += '<div class="detail-divider"></div><div class="detail-label" style="margin-bottom:10px;">&#128198; Journey Timeline</div><div class="milestone-timeline">';
                    var eventIcons  = { 'DISPATCHED':'&#128666;','CHECKPOINT':'&#128205;','WEATHER_ALERT':'&#9928;','DELAYED':'&#9888;','REROUTED':'&#128260;','ARRIVED_HUB':'&#127981;','OUT_FOR_DELIVERY':'&#128230;','DELIVERED':'&#9989;' };
                    var eventColors = { 'DISPATCHED':'#4fc3f7','CHECKPOINT':'#94a3b8','WEATHER_ALERT':'#f59e0b','DELAYED':'#ef4444','REROUTED':'#a78bfa','ARRIVED_HUB':'#4fc3f7','OUT_FOR_DELIVERY':'#f59e0b','DELIVERED':'#10b981' };
                    milestones.forEach(function (m, i) {
                        var mIcon  = eventIcons[m.eventType]  || '&#9679;';
                        var mColor = eventColors[m.eventType] || '#94a3b8';
                        var mTime  = new Date(m.occurredAt).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
                        html += '<div class="milestone-item">' +
                            '<div class="milestone-line-wrap">' +
                            '<div class="milestone-dot" style="background:var(--bg-card);border:2px solid ' + mColor + ';color:' + mColor + ';">' + mIcon + '</div>' +
                            (i < milestones.length - 1 ? '<div class="milestone-connector"></div>' : '') +
                            '</div>' +
                            '<div class="milestone-body">' +
                            '<div class="milestone-event" style="color:' + mColor + '">' + m.eventType.replace(/_/g,' ') + '</div>' +
                            '<div class="milestone-desc">' + m.description + '</div>' +
                            '<div class="milestone-time">' + mTime + (m.location ? ' &bull; ' + m.location : '') + '</div>' +
                            '</div></div>';
                    });
                    html += '</div>';
                }
            }
        } catch (mErr) { console.warn('Milestones:', mErr); }

        // Add speed + distance + replay button
        var speedKmh  = typeof getShipmentSpeedKmh === 'function' ? getShipmentSpeedKmh(id) : null;
        var distRemKm = (s.currentLat && s.destLat && s.status !== 'DELIVERED')
            ? Math.round(haversineKmHelper(s.currentLat, s.currentLng, s.destLat, s.destLng))
            : null;

        var liveStatsHtml = '';
        if (s.status === 'IN_TRANSIT' || s.status === 'REROUTED') {
            liveStatsHtml =
                '<div class="detail-divider"></div>' +
                '<div class="detail-label" style="margin-bottom:8px;">&#128663; Live Tracking</div>' +
                '<div class="live-stats-row">' +
                '<div class="live-stat-box">' +
                '<div class="live-stat-value">' + (speedKmh ? speedKmh + ' km/h' : '~60 km/h') + '</div>' +
                '<div class="live-stat-label">Current Speed</div>' +
                '</div>' +
                '<div class="live-stat-box">' +
                '<div class="live-stat-value">' + (distRemKm !== null ? distRemKm + ' km' : 'N/A') + '</div>' +
                '<div class="live-stat-label">Distance Remaining</div>' +
                '</div>' +
                '</div>' +
                '<button onclick="replayJourney(' + id + ')" ' +
                'style="margin-top:10px;width:100%;padding:8px;background:rgba(167,139,250,0.1);' +
                'color:#a78bfa;border:1px solid rgba(167,139,250,0.3);border-radius:6px;' +
                'font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font-main);">' +
                '&#9654; Replay Journey' +
                '</button>';
        }

        document.getElementById('panelBody').innerHTML = html + liveStatsHtml;
        if (s.status === 'DELAYED') document.getElementById('panelActions').style.display = 'flex';

        // Load weather AFTER setting innerHTML so the element exists
        loadWeatherForDetail(s.currentLat, s.currentLng);

    } catch (error) {
        console.error('Detail load failed:', error);
        document.getElementById('panelBody').innerHTML = '<div class="empty-state"><p style="color:#ef4444;">Failed to load details.</p></div>';
    }
}

// ----------------------------------------------------------------
// WEATHER FOR DETAIL PANEL
// ----------------------------------------------------------------
async function loadWeatherForDetail(lat, lng) {
    var el = document.getElementById('weatherDetail');
    if (!el) return;
    try {
        var resp = await fetch(API_BASE + '/api/weather/' + lat + '/' + lng, { credentials: 'include' });
        if (!resp.ok) { el.textContent = 'Weather data unavailable'; return; }
        var w      = await resp.json();
        var wColor = w.severity === 'HIGH' ? '#ef4444' : w.severity === 'MEDIUM' ? '#f59e0b' : '#10b981';

        el.innerHTML =
            '<div style="background:rgba(79,195,247,0.06);border:1px solid rgba(79,195,247,0.15);border-radius:8px;padding:10px 12px;">' +
            '<div style="font-size:16px;margin-bottom:6px;">' + (w.icon || '🌤') + ' <strong style="color:' + wColor + '">' + (w.description || w.main || 'N/A') + '</strong></div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px;color:var(--text-secondary);">' +
            '<span>&#127777; ' + (w.temp ? w.temp.toFixed(1) + '°C' : '--') + '</span>' +
            '<span>&#128168; Humidity: ' + (w.humidity || '--') + '%</span>' +
            '<span>&#127787; Wind: ' + (w.wind_speed ? w.wind_speed.toFixed(1) + ' km/h' : '--') + '</span>' +
            '<span style="color:' + wColor + ';font-weight:600;">Risk: ' + (w.severity || 'LOW') + '</span>' +
            '</div>' +
            (w.isHazardous ? '<div style="margin-top:6px;font-size:11px;color:#fca5a5;">&#9888; Hazardous conditions — delay risk increased</div>' : '') +
            '</div>';
    } catch (e) {
        if (el) el.textContent = 'Weather data unavailable';
    }
}

// ----------------------------------------------------------------
// TRIGGER DISRUPTION (uses real news)
// ----------------------------------------------------------------
/*async function triggerDisruption() {
    var btn = document.getElementById('triggerDisruptionBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Simulating...'; }

    try {
        var response = await fetch(API_BASE + '/api/disruptions/trigger', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include'
        });
        var data = await response.json();

        if (response.status === 409) {
            showToast('warning', '&#9888; No Targets', 'All shipments are already DELAYED or REROUTED.');
        } else if (response.ok || response.status === 201) {
            var anomaly    = data.anomaly;
            var shipmentId = data.affectedShipmentId;
            var now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
            disruptionTimestamps.push(now);
            disruptionHistory.push(disruptionHistory.length > 0 ? disruptionHistory[disruptionHistory.length-1] + 1 : 1);
            if (disruptionTimestamps.length > 10) { disruptionTimestamps.shift(); disruptionHistory.shift(); }

            showToast('danger',
                '&#9889; Disruption — Shipment #' + shipmentId,
                (anomaly ? anomaly.description : 'Route anomaly detected.') +
                '<br><em style="color:#94a3b8;font-size:11px;">Severity: ' + (anomaly ? anomaly.severity : 'HIGH') + ' | ' + now + '</em>');

            await loadShipments();
            if (selectedShipmentId === shipmentId) await selectShipment(shipmentId);
        }
    } catch (error) {
        showToast('danger', 'API Error', 'Could not reach the server.');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '&#9889; Simulate Severe Weather'; }
    }
}*/

// ----------------------------------------------------------------
// CALCULATE REROUTE
// ----------------------------------------------------------------
async function calculateReroute(id, trackingId) {
    var sidebarBtn = document.getElementById('reroute-btn-' + id);
    if (sidebarBtn) { sidebarBtn.disabled = true; sidebarBtn.textContent = 'Calculating...'; }
    var panelBtn = document.getElementById('rerouteBtn');
    if (panelBtn) { panelBtn.disabled = true; panelBtn.textContent = 'Processing...'; }

    try {
        var response = await fetch(API_BASE + '/api/shipments/' + id + '/reroute',
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
        var data = await response.json();
        if (response.ok) {
            var newEta = formatEtaDisplay(data.shipment);
            showToast('success', '&#128260; Reroute Approved — ' + (trackingId || data.shipment.trackingId),
                'REROUTED via alternate corridor.<br><em style="color:#94a3b8;font-size:11px;">New ETA: ' + newEta + '</em>');
            await loadShipments();
            if (selectedShipmentId === id) await selectShipment(id);
        } else {
            showToast('warning', 'Reroute Failed', data.error || 'Could not reroute.');
            if (sidebarBtn) { sidebarBtn.disabled = false; sidebarBtn.innerHTML = '&#128260; Calculate Reroute'; }
        }
    } catch (error) {
        showToast('danger', 'API Error', 'Could not reach the server.');
        if (sidebarBtn) { sidebarBtn.disabled = false; sidebarBtn.innerHTML = '&#128260; Calculate Reroute'; }
    }
    await openRerouteModal(id, trackingId);
}

async function rerouteShipment() {
    if (!selectedShipmentId) return;
    var s = allShipments.find(function (x) { return x.id === selectedShipmentId; });
    await openRerouteModal(selectedShipmentId, s ? s.trackingId : '');
}

// ----------------------------------------------------------------
// WIRE BUTTONS
// ----------------------------------------------------------------
function wireButtons() {

    var rb = document.getElementById('rerouteBtn');
    if (rb) rb.addEventListener('click', rerouteShipment);

    var cb = document.getElementById('closePanelBtn');
    if (cb) cb.addEventListener('click', function () {
        document.getElementById('detailPanel').classList.remove('open');
        document.querySelectorAll('.shipment-card').forEach(function (c) { c.classList.remove('active'); });
        selectedShipmentId = null;
    });
}

// ----------------------------------------------------------------
// KPI CARDS
// ----------------------------------------------------------------
function updateKpiCards(shipments) {
    var c = { IN_TRANSIT:0, DELAYED:0, REROUTED:0, DELIVERED:0 };
    shipments.forEach(function (s) { if (c[s.status] !== undefined) c[s.status]++; });
    var set = function (id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
    set('kpiInTransit', c.IN_TRANSIT);
    set('kpiDelayed',   c.DELAYED);
    set('kpiRerouted',  c.REROUTED);
    set('kpiDelivered', c.DELIVERED);
    var dc = document.getElementById('kpiDelayed');
    if (dc) {
        var kc = dc.closest('.kpi-card');
        if (kc) { kc.style.borderColor = c.DELAYED > 0 ? 'rgba(239,68,68,0.5)' : ''; kc.style.boxShadow = c.DELAYED > 0 ? '0 0 12px rgba(239,68,68,0.15)' : ''; }
    }
}

// ----------------------------------------------------------------
// ANALYTICS
// ----------------------------------------------------------------
function renderAnalytics(shipments) {
    var c = { IN_TRANSIT:0, DELAYED:0, REROUTED:0, DELIVERED:0 };
    shipments.forEach(function (s) { if (c[s.status] !== undefined) c[s.status]++; });
    var total = shipments.length || 1;
    var health = Math.round(((c.IN_TRANSIT + c.DELIVERED + (c.REROUTED * 0.6)) / total) * 100);

    var se = document.getElementById('healthScore');
    if (se) { se.textContent = health + '%'; se.style.color = health >= 70 ? '#10b981' : health >= 40 ? '#f59e0b' : '#ef4444'; }
    var he = document.getElementById('healthScoreHeader');
    if (he) { he.textContent = health + '%'; he.style.color = health >= 70 ? '#10b981' : health >= 40 ? '#f59e0b' : '#ef4444'; }
    var fe = document.getElementById('healthFill');
    if (fe) fe.style.width = health + '%';

    if (donutChartInstance) {
        donutChartInstance.data.datasets[0].data = [c.IN_TRANSIT, c.DELAYED, c.REROUTED, c.DELIVERED];
        donutChartInstance.update('active');
    }
    if (barChartInstance) {
        var sm = { IN_TRANSIT:0, DELAYED:2, REROUTED:1, DELIVERED:0 };
        var bc = { IN_TRANSIT:'rgba(79,195,247,0.45)', DELAYED:'rgba(239,68,68,0.7)', REROUTED:'rgba(167,139,250,0.55)', DELIVERED:'rgba(16,185,129,0.45)' };
        barChartInstance.data.labels = shipments.map(function (s) { return s.trackingId.replace('VSST-BLR-','VSST-'); });
        barChartInstance.data.datasets[0].data             = shipments.map(function (s) { return sm[s.status] || 0; });
        barChartInstance.data.datasets[0].backgroundColor  = shipments.map(function (s) { return bc[s.status] || 'rgba(79,195,247,0.45)'; });
        barChartInstance.update('active');
    }
}

// ----------------------------------------------------------------
// LOAD ANOMALY HISTORY
// ----------------------------------------------------------------
async function loadAnomalyHistory() {
    try {
        var resp = await fetch(API_BASE + '/api/anomalies', { credentials: 'include' });
        if (!resp.ok) return;
        var anomalies = await resp.json();
        if (!anomalies || anomalies.length === 0) return;

        disruptionTimestamps = [];
        disruptionHistory    = [];
        anomalies.forEach(function (a, i) {
            var t = a.detectedAt ? new Date(a.detectedAt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:false }) : ('T' + (i+1));
            disruptionTimestamps.push(t);
            disruptionHistory.push(i + 1);
        });
        if (disruptionTimestamps.length > 10) {
            disruptionTimestamps = disruptionTimestamps.slice(-10);
            disruptionHistory    = disruptionHistory.slice(-10);
        }
        if (lineChartInstance) {
            lineChartInstance.data.labels           = disruptionTimestamps;
            lineChartInstance.data.datasets[0].data = disruptionHistory;
            lineChartInstance.update('active');
        }
    } catch (e) { console.warn('Anomaly history:', e); }
}

// ----------------------------------------------------------------
// INIT ALL CHARTS
// ----------------------------------------------------------------
function initAllCharts() {
    Chart.defaults.color       = '#475569';
    Chart.defaults.font.family = 'Inter, sans-serif';
    var td = { backgroundColor:'#111130', borderColor:'#252550', borderWidth:1, titleColor:'#e2e8f0', bodyColor:'#94a3b8', padding:10 };

    var dc = document.getElementById('statusChart');
    if (dc) donutChartInstance = new Chart(dc.getContext('2d'), {
        type: 'doughnut',
        data: { labels:['In Transit','Delayed','Rerouted','Delivered'], datasets:[{ data:[0,0,0,0], backgroundColor:['rgba(79,195,247,0.75)','rgba(239,68,68,0.75)','rgba(167,139,250,0.75)','rgba(16,185,129,0.75)'], borderColor:['#4fc3f7','#ef4444','#a78bfa','#10b981'], borderWidth:2, hoverOffset:6 }] },
        options: { responsive:true, maintainAspectRatio:false, cutout:'72%', plugins:{ legend:{ position:'right', labels:{ color:'#94a3b8', font:{family:'Inter',size:11}, boxWidth:12, padding:12, usePointStyle:true } }, tooltip:td } }
    });

    var bc = document.getElementById('anomalyChart');
    if (bc) barChartInstance = new Chart(bc.getContext('2d'), {
        type: 'bar',
        data: { labels:[], datasets:[{ label:'Risk Level', data:[], backgroundColor:'rgba(239,68,68,0.25)', borderColor:'#ef4444', borderWidth:1.5, borderRadius:5, borderSkipped:false }] },
        options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ labels:{ color:'#94a3b8', font:{family:'Inter',size:11}, boxWidth:11 } }, tooltip:td }, scales:{ x:{ ticks:{color:'#475569',font:{size:11}}, grid:{color:'rgba(255,255,255,0.04)'} }, y:{ beginAtZero:true, max:3, ticks:{color:'#475569',font:{size:11},stepSize:1,callback:function(v){return ['','Normal','Rerouted','Disrupted'][v]||''}}, grid:{color:'rgba(255,255,255,0.06)'} } } }
    });

    var lc = document.getElementById('disruptionLineChart');
    if (lc) lineChartInstance = new Chart(lc.getContext('2d'), {
        type: 'line',
        data: { labels:['Start'], datasets:[{ label:'Cumulative Disruptions', data:[0], borderColor:'#ef4444', backgroundColor:'rgba(239,68,68,0.08)', borderWidth:2, tension:0.4, fill:true, pointBackgroundColor:'#ef4444', pointBorderColor:'#fff', pointBorderWidth:1.5, pointRadius:4, pointHoverRadius:6 }] },
        options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ labels:{ color:'#94a3b8', font:{family:'Inter',size:11}, boxWidth:11 } }, tooltip:td }, scales:{ x:{ ticks:{color:'#475569',font:{size:10}}, grid:{color:'rgba(255,255,255,0.04)'} }, y:{ beginAtZero:true, ticks:{color:'#475569',font:{size:11},stepSize:1}, grid:{color:'rgba(255,255,255,0.06)'} } } }
    });
}

// ----------------------------------------------------------------
// TOAST
// ----------------------------------------------------------------
function showToast(type, title, message) {
    var container = document.getElementById('toastContainer');
    if (!container) return;
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.innerHTML = '<div class="toast-title">' + title + '</div><div class="toast-message">' + message + '</div>';
    container.appendChild(toast);
    setTimeout(function () {
        toast.style.opacity = '0'; toast.style.transform = 'translateX(110%)'; toast.style.transition = 'all 0.3s ease';
        setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
    }, 6000);
}

// ================================================================
// DAY 12 — MULTI-ROUTE AI ENGINE
// ================================================================

var pendingRerouteId = null;

// ----------------------------------------------------------------
// Open the AI reroute modal (called instead of direct reroute)
// ----------------------------------------------------------------
async function openRerouteModal(shipmentId, trackingId) {
    pendingRerouteId = shipmentId;

    var modal = document.getElementById('rerouteModal');
    var body  = document.getElementById('rerouteModalBody');
    if (!modal || !body) {
        // Fallback to direct reroute if modal not found
        await calculateReroute(shipmentId, trackingId);
        return;
    }

    modal.style.display = 'flex';
    body.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">&#129302; AI is calculating optimal routes...<br><small style="font-size:11px;margin-top:8px;display:block;">Analysing weather, road conditions and distance</small></div>';

    try {
        var resp = await fetch(API_BASE + '/api/routes/' + shipmentId + '/alternatives',
            { credentials: 'include' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var data = await resp.json();
        renderRerouteOptions(data);
    } catch (e) {
        body.innerHTML = '<p style="color:#ef4444;padding:20px;">Could not load route options: ' + e.message + '</p>';
    }
}

function closeRerouteModal() {
    var modal = document.getElementById('rerouteModal');
    if (modal) modal.style.display = 'none';
    pendingRerouteId = null;
}

function renderRerouteOptions(data) {
    var body   = document.getElementById('rerouteModalBody');
    var routes = data.routes || [];
    var w      = data.weather || {};
    var wColor = w.severity === 'HIGH' ? '#ef4444' : w.severity === 'MEDIUM' ? '#f59e0b' : '#10b981';

    var html =
        '<div style="background:rgba(79,195,247,0.06);border:1px solid rgba(79,195,247,0.15);border-radius:8px;padding:12px 16px;margin-bottom:20px;">' +
        '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">Shipment <strong style="color:var(--accent-blue)">' + data.trackingId + '</strong> &nbsp;&bull;&nbsp; ' + data.origin + ' → ' + data.destination + ' &nbsp;&bull;&nbsp; ' + (data.distRemaining || '--') + ' km remaining</div>' +
        '<div style="font-size:12px;color:' + wColor + '">' + (w.icon || '🌤') + ' Current weather at shipment: <strong>' + (w.description || w.main || 'N/A') + '</strong> · ' + (w.temp ? w.temp.toFixed(1) + '°C' : '') + ' · Wind: ' + (w.wind_speed ? w.wind_speed.toFixed(1) + ' km/h' : '--') + '</div>' +
        '</div>';

    routes.forEach(function (r) {
        var isRec    = r.recommended;
        var tagColor = r.risk === 'LOW' ? '#10b981' : r.risk === 'HIGH' ? '#ef4444' : '#f59e0b';

        html +=
            '<div style="background:var(--bg-card);border:1px solid ' + (isRec ? r.riskColor : 'var(--border-dim)') + ';border-radius:10px;padding:18px;margin-bottom:14px;position:relative;">' +
            (r.etaTag ? '<span style="position:absolute;top:14px;right:14px;font-size:10px;font-weight:700;padding:3px 10px;background:' + r.riskColor + '20;color:' + r.riskColor + ';border:1px solid ' + r.riskColor + '40;border-radius:10px;">' + r.etaTag + '</span>' : '') +
            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">' +
            '<span style="font-size:20px;font-weight:800;font-family:var(--font-mono);color:' + r.riskColor + ';">Route ' + r.id + '</span>' +
            '<span style="font-size:14px;font-weight:600;color:var(--text-primary);">' + r.name + '</span>' +
            '</div>' +
            '<p style="font-size:13px;color:var(--text-secondary);margin-bottom:10px;">' + r.description + '</p>' +
            '<div style="display:flex;gap:20px;margin-bottom:10px;flex-wrap:wrap;">' +
            '<span style="font-size:12px;color:var(--text-muted);">&#128337; Extra time: <strong style="color:var(--text-primary);">+' + r.extraHours + ' hrs</strong></span>' +
            '<span style="font-size:12px;color:var(--text-muted);">&#128204; Extra distance: <strong style="color:var(--text-primary);">+' + r.extraKm + ' km</strong></span>' +
            '<span style="font-size:12px;">Risk: <strong style="color:' + r.riskColor + ';">' + r.risk + '</strong></span>' +
            '</div>' +
            '<div style="background:rgba(167,139,250,0.08);border:1px solid rgba(167,139,250,0.2);border-radius:6px;padding:8px 12px;margin-bottom:12px;font-size:12px;color:#c4b5fd;">' +
            '&#129302; <strong>AI Analysis:</strong> ' + r.aiReason +
            '</div>' +
            '<button onclick="approveRoute(\'' + data.shipmentId + '\',\'' + r.id + '\',\'' + r.name + '\',' + r.extraHours + ')" ' +
            'style="padding:9px 20px;background:' + (isRec ? r.riskColor : 'rgba(79,195,247,0.12)') + ';color:' + (isRec ? '#fff' : 'var(--accent-blue)') + ';border:1px solid ' + r.riskColor + ';border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-main);">' +
            (isRec ? '&#9989; Approve This Route' : '&#128260; Select Route ' + r.id) +
            '</button>' +
            '</div>';
    });

    body.innerHTML = html;
}

async function approveRoute(shipmentId, routeId, routeName, extraHours) {
    var id = parseInt(shipmentId);

    try {
        var resp = await fetch(API_BASE + '/api/shipments/' + id + '/reroute',
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
        var data = await resp.json();

        if (resp.ok) {
            showToast('success',
                '&#129302; Route ' + routeId + ' Approved',
                '"' + routeName + '" selected. Shipment is now REROUTED.<br>' +
                '<em style="color:#94a3b8;font-size:11px;">ETA extended by ' + extraHours + ' hours buffer applied.</em>');
            closeRerouteModal();
            await loadShipments();
            if (selectedShipmentId === id) await selectShipment(id);
        } else {
            showToast('danger', 'Approval Failed', data.error || 'Could not reroute shipment.');
        }
    } catch (e) {
        showToast('danger', 'Error', e.message);
    }
}

function haversineKmHelper(lat1, lng1, lat2, lng2) {
    var R    = 6371;
    var dLat = (lat2-lat1)*Math.PI/180;
    var dLng = (lng2-lng1)*Math.PI/180;
    var a    = Math.sin(dLat/2)*Math.sin(dLat/2) +
        Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*
        Math.sin(dLng/2)*Math.sin(dLng/2);
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}