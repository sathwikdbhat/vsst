// ============================================================
// VSST — auth.js
// ============================================================

var AUTH_KEY = 'logipulse_user';

function getCurrentUser() {
    try {
        var raw = localStorage.getItem(AUTH_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}

function storeUser(user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

function clearUser() {
    localStorage.removeItem(AUTH_KEY);
}

function isLoggedIn() {
    return getCurrentUser() !== null;
}

// Require login — redirect to login if not logged in
function requireAuth() {
    var currentPath = window.location.pathname;

    if (!isLoggedIn()) {
        // FIX: Prevent infinite loop if already on a public page
        if (!currentPath.includes('/login.html') &&
            !currentPath.includes('/register.html') &&
            !currentPath.includes('/welcome.html')) {
            window.location.href = '/login.html';
        }
        return false;
    }

    var user = getCurrentUser();

    // Force Admins and Operators OUT of the driver dashboard
    if (user && (user.role === 'ADMIN' || user.role === 'OPERATOR') && currentPath.includes('/driver.html')) {
        window.location.href = '/index.html';
        return false;
    }

    // Force Drivers and Partners OUT of the admin dashboards
    if (user && (user.role === 'DRIVER' || user.role === 'PARTNER') &&
        (currentPath.includes('/index.html') ||
            currentPath === '/' ||
            currentPath.includes('/shipments.html') ||
            currentPath.includes('/fleet.html') ||
            currentPath.includes('/analytics.html') ||
            currentPath.includes('/clients.html'))) {
        window.location.href = '/driver.html';
        return false;
    }

    return true;
}

// Require DRIVER or PARTNER role — redirect admins/operators away from driver page
function requireDriverAuth() {
    var currentPath = window.location.pathname;

    if (!isLoggedIn()) {
        // FIX: Prevent infinite loop if already on a public page
        if (!currentPath.includes('/login.html') &&
            !currentPath.includes('/register.html') &&
            !currentPath.includes('/welcome.html')) {
            window.location.href = '/login.html';
        }
        return false;
    }

    var user = getCurrentUser();
    if (!user || (user.role !== 'DRIVER' && user.role !== 'PARTNER')) {
        window.location.href = '/index.html';
        return false;
    }
    return true;
}

// Redirects users away from login/register pages if they are already logged in
function redirectIfLoggedIn() {
    if (isLoggedIn()) {
        var user = getCurrentUser();
        var currentPath = window.location.pathname;

        // Prevent infinite loops by checking if we are ALREADY on the target page
        if (user && (user.role === 'DRIVER' || user.role === 'PARTNER')) {
            if (!currentPath.includes('/driver.html')) {
                window.location.href = '/driver.html';
            }
        } else {
            if (!currentPath.includes('/index.html') && currentPath !== '/') {
                window.location.href = '/index.html';
            }
        }
    }
}

function getRoleColor(role) {
    var colors = {
        'ADMIN':    '#ef4444',
        'OPERATOR': '#4fc3f7',
        'DRIVER':   '#10b981',
        'PARTNER':  '#a78bfa'
    };
    return colors[role] || '#94a3b8';
}

async function apiLogin(username, password) {
    var response = await fetch('/api/auth/login', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({ username: username, password: password })
    });
    var data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Login failed');

    // 1. Securely store the user session immediately
    storeUser(data);

    // 2. Perform the routing right here to override any bugs in login.html
    if (data.role === 'DRIVER' || data.role === 'PARTNER') {
        window.location.href = '/driver.html';
    } else {
        window.location.href = '/index.html';
    }

    return data;
}

async function apiRegister(userData) {
    var response = await fetch('/api/auth/register', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify(userData)
    });
    var data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Registration failed');

    // Auto-login after registration
    storeUser(data);
    if (data.role === 'DRIVER' || data.role === 'PARTNER') {
        window.location.href = '/driver.html';
    } else {
        window.location.href = '/index.html';
    }

    return data;
}

async function apiLogout() {
    try {
        await fetch('/api/auth/logout', {
            method:      'POST',
            credentials: 'include'
        });
    } catch (e) { console.error('Logout error:', e); }
    clearUser();
    window.location.href = '/welcome.html';
}

async function apiRegisterDriver(driverData) {
    var response = await fetch('/api/auth/register-driver', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify(driverData)
    });
    var data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to create driver');
    return data;
}

function showFormError(elementId, message) {
    var el = document.getElementById(elementId);
    if (el) { el.textContent = message; el.style.display = 'block'; }
}

function hideFormError(elementId) {
    var el = document.getElementById(elementId);
    if (el) el.style.display = 'none';
}

function setButtonLoading(buttonId, loading, originalText) {
    var btn = document.getElementById(buttonId);
    if (!btn) return;
    btn.disabled    = loading;
    btn.textContent = loading ? 'Please wait...' : originalText;
}