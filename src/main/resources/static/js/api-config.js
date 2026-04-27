// ============================================================
// LogiPulse — api-config.js
// Single source of truth for API base URL.
// Automatically works on localhost, ngrok, Render, or any host.
// ============================================================

(function () {
    // window.location.origin gives:
    //   http://localhost:9090        on your machine
    //   https://abc123.ngrok.io     when accessed via ngrok
    //   https://logipulse.onrender.com  when deployed
    window.API_BASE = window.location.origin;
    console.log('LogiPulse API_BASE:', window.API_BASE);
})();