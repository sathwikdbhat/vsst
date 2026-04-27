// ============================================================
// VSST — notifications.js
// Universal: Works on Admin, Operator, Driver, and Partner dashboards
// ============================================================

(function () {
    var API_BASE = window.API_BASE || window.location.origin;

    var notifData   = [];
    var unreadCount = 0;
    var isDropdownOpen = false;
    var pollTimer   = null;

    // Elements
    var activeBellBtn = null;
    var activeDropdown = null;
    var activeBadge = null;
    var activeList = null;

    // ============================================================
    // INIT — Detects which dashboard is currently loaded
    // ============================================================
    function init() {
        // Detect buttons (Admin vs Driver view)
        activeBellBtn  = document.getElementById('adminNotifBell') || document.getElementById('notifBell') || document.getElementById('driverBellBtn');
        activeDropdown = document.getElementById('adminNotifDropdown') || document.getElementById('notifDropdown') || document.getElementById('driverNotifDropdown');
        activeBadge    = document.getElementById('adminNotifCount') || document.getElementById('notifCount') || document.getElementById('driverBellCount');
        activeList     = document.getElementById('adminNotifList') || document.getElementById('notifList') || document.getElementById('driverNotifList');

        if (!activeBellBtn || !activeDropdown || !activeList) return;

        // Attach click handler to bell
        activeBellBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleDropdown();
        });

        // Close when clicking outside
        document.addEventListener('click', function (e) {
            if (!activeDropdown.contains(e.target) && !activeBellBtn.contains(e.target)) {
                closeDropdown();
            }
        });

        // Mark all read button mapping
        var markAllBtn = document.getElementById('markAllReadBtn') || document.getElementById('adminMarkAllReadBtn');
        if (markAllBtn) {
            markAllBtn.addEventListener('click', function (e) { e.stopPropagation(); markAllRead(); });
        }

        // Clear all button mapping
        var clearBtn = document.getElementById('clearAllNotifsBtn') || document.getElementById('adminClearAllBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', function (e) { e.stopPropagation(); clearAll(); });
        }

        // Initial load
        fetchNotifications();

        // Poll every 15 seconds
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = setInterval(fetchNotifications, 15000);
    }

    // ============================================================
    // TOGGLE DROPDOWN
    // ============================================================
    function toggleDropdown() {
        isDropdownOpen = !isDropdownOpen;
        if (isDropdownOpen) {
            activeDropdown.style.display = 'flex';
            activeDropdown.style.flexDirection = 'column';
            // Force open class for driver dashboard styles
            activeDropdown.classList.add('open');
            fetchNotifications();
        } else {
            closeDropdown();
        }
    }

    function closeDropdown() {
        isDropdownOpen = false;
        if (activeDropdown) {
            activeDropdown.style.display = 'none';
            activeDropdown.classList.remove('open');
        }
    }

    // ============================================================
    // FETCH NOTIFICATIONS
    // ============================================================
    async function fetchNotifications() {
        try {
            var [nResp, cResp] = await Promise.all([
                fetch(API_BASE + '/api/notifications',             { credentials: 'include' }),
                fetch(API_BASE + '/api/notifications/unread-count', { credentials: 'include' })
            ]);

            if (!nResp.ok) return;

            notifData   = await nResp.json();
            var cData   = cResp.ok ? await cResp.json() : { count: 0 };
            unreadCount = cData.count || 0;

            updateBellBadge();
            if (isDropdownOpen) renderList();

        } catch (e) {
            // Silently fail if not authenticated
        }
    }

    // ============================================================
    // UPDATE BELL BADGE
    // ============================================================
    function updateBellBadge() {
        if (!activeBadge) return;
        activeBadge.textContent   = unreadCount > 9 ? '9+' : unreadCount;
        activeBadge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }

    // ============================================================
    // RENDER NOTIFICATION LIST
    // ============================================================
    function renderList() {
        if (!activeList) return;

        if (!notifData || notifData.length === 0) {
            activeList.innerHTML =
                '<div style="padding:20px;text-align:center;' +
                'font-size:12px;color:var(--text-muted);">' +
                '✅ No notifications</div>';
            return;
        }

        var html = '';
        notifData.slice(0, 25).forEach(function (n) {
            var sevColor = n.severity === 'DANGER'  ? '#ef4444' :
                n.severity === 'WARNING' ? '#f59e0b' :
                    n.severity === 'SUCCESS' ? '#10b981' : '#4fc3f7';

            var timeStr = n.createdAt
                ? new Date(n.createdAt).toLocaleString('en-IN', {
                    day:    '2-digit', month: 'short',
                    hour:   '2-digit', minute: '2-digit',
                    hour12: true })
                : '';

            html +=
                '<div class="notif-item' + (!n.read ? ' notif-unread' : '') + '" ' +
                'onclick="vsst_markRead(' + n.id + ')" ' +
                'style="padding:9px 12px;border-bottom:1px solid var(--border-dim);' +
                'cursor:pointer;transition:background 0.15s;' +
                (!n.read ? 'border-left:3px solid ' + sevColor + ';' : '') + '">' +

                '<div style="font-size:11px;font-weight:' + (!n.read ? '700' : '500') + ';' +
                'color:var(--text-primary);margin-bottom:2px;">' +
                (n.title || 'Notification') + '</div>' +

                '<div style="font-size:10px;color:var(--text-secondary);' +
                'line-height:1.4;margin-bottom:2px;">' +
                shortenText(n.message || '', 100) + '</div>' +

                '<div style="font-size:9px;color:var(--text-muted);">' + timeStr + '</div>' +
                '</div>';
        });

        activeList.innerHTML = html;
    }

    // ============================================================
    // MARK AS READ
    // ============================================================
    window.vsst_markRead = async function (id) {
        try {
            await fetch(API_BASE + '/api/notifications/' + id + '/read', {
                method: 'PUT', credentials: 'include'
            });
            await fetchNotifications();
            if (isDropdownOpen) renderList();
        } catch (e) {}
    };

    // ============================================================
    // MARK ALL AS READ
    // ============================================================
    async function markAllRead() {
        try {
            var resp = await fetch(API_BASE + '/api/notifications/mark-all-read', {
                method: 'PUT', credentials: 'include'
            });
            if (resp.ok) {
                await fetchNotifications();
                renderList();
            } else {
                // Fallback: mark individually
                for (var n of notifData) {
                    if (!n.read) {
                        await fetch(API_BASE + '/api/notifications/' + n.id + '/read', {
                            method: 'PUT', credentials: 'include'
                        });
                    }
                }
                await fetchNotifications();
                renderList();
            }
        } catch (e) {}
    }

    // ============================================================
    // CLEAR ALL
    // ============================================================
    async function clearAll() {
        try {
            await fetch(API_BASE + '/api/notifications/clear', {
                method: 'DELETE', credentials: 'include'
            });
            notifData = []; unreadCount = 0;
            updateBellBadge();
            renderList();
        } catch (e) {}
    }

    // ============================================================
    // EXPOSE to global scope (Overrides inline driver.html functions)
    // ============================================================
    window.toggleSmartAlerts      = toggleDropdown;
    window.toggleDriverBell       = toggleDropdown; // Overrides the one in driver.html
    window.fetchSmartAlerts       = fetchNotifications;
    window.markAllAlertsRead      = markAllRead;
    window.markAllDriverNotifRead = markAllRead;    // Overrides the one in driver.html
    window.clearAllAlerts         = clearAll;
    window.pollUnreadCount        = fetchNotifications;

    // ============================================================
    // HELPERS
    // ============================================================
    function shortenText(text, max) {
        if (!text) return '';
        return text.length > max ? text.substring(0, max) + '...' : text;
    }

    // ============================================================
    // STARTUP — wait for DOM then init
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }

})();