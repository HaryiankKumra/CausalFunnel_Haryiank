/**
 * User Analytics Tracking Script
 * 
 * A lightweight, standalone JavaScript tracking script that records
 * page views and clicks, then sends them to the analytics backend.
 * 
 * EMBEDDING:
 *   Add this to any webpage:
 *   <script src="tracker.js" data-api-url="http://localhost:5000"></script>
 */

(function () {
  "use strict";

  // ============================================================
  // Configuration
  // ============================================================

  const scriptTag = document.currentScript;
  const API_URL =
    (scriptTag && scriptTag.getAttribute("data-api-url")) ||
    "http://localhost:5000";

  const EVENTS_ENDPOINT = API_URL + "/api/events";

  // ============================================================
  // Session Management
  // ============================================================

  const SESSION_KEY = "analytics_session_id";

  function generateSessionId() {
    try {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return "sess_" + crypto.randomUUID();
      }
    } catch (e) {}
    var hex = Math.random().toString(16).substring(2, 10);
    return "sess_" + Date.now().toString(36) + "_" + hex;
  }

  function getSessionId() {
    try {
      var stored = localStorage.getItem(SESSION_KEY);
      if (stored) return stored;

      var newId = generateSessionId();
      localStorage.setItem(SESSION_KEY, newId);
      return newId;
    } catch (e) {
      return generateSessionId();
    }
  }

  var sessionId = getSessionId();

  // ============================================================
  // Event Delivery
  // ============================================================

  function sendEvent(eventData) {
    var payload = JSON.stringify(eventData);

    // Primary: fetch with keepalive (shows in DevTools Network tab, reliable)
    if (typeof fetch === "function") {
      fetch(EVENTS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      })
        .then(function (res) {
          if (res.ok) {
            console.log("[CausalPulse Tracker] Event recorded:", eventData.event_type);
          }
        })
        .catch(function () {
          // Fallback to sendBeacon if fetch encounters network error
          trySendBeacon(payload);
        });
      return;
    }

    trySendBeacon(payload);
  }

  function trySendBeacon(payload) {
    try {
      if (typeof navigator.sendBeacon === "function") {
        var blob = new Blob([payload], { type: "text/plain" });
        navigator.sendBeacon(EVENTS_ENDPOINT, blob);
      }
    } catch (e) {}
  }

  function getCleanPageUrl() {
    return window.location.href.split('#')[0];
  }

  // ============================================================
  // Page View Tracking
  // ============================================================

  function trackPageView() {
    sendEvent({
      session_id: sessionId,
      event_type: "page_view",
      page_url: getCleanPageUrl(),
      timestamp: new Date().toISOString(),
      x: null,
      y: null,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
    });
  }

  // ============================================================
  // Click Tracking
  // ============================================================

  function trackClick(event) {
    sendEvent({
      session_id: sessionId,
      event_type: "click",
      page_url: getCleanPageUrl(),
      timestamp: new Date().toISOString(),
      x: Math.round(event.clientX),
      y: Math.round(event.clientY),
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
    });
  }

  // ============================================================
  // Initialisation
  // ============================================================

  if (window.__analytics_tracker_loaded) return;
  window.__analytics_tracker_loaded = true;

  trackPageView();
  document.addEventListener("click", trackClick, { passive: true });
})();
