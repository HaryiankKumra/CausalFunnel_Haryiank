/**
 * User Analytics Tracking Script
 * 
 * A lightweight, standalone JavaScript tracking script that records
 * page views and clicks, then sends them to the analytics backend.
 * 
 * EMBEDDING:
 *   Add this to any webpage:
 *   <script src="tracker.js" data-api-url="http://localhost:5000"></script>
 * 
 *   The data-api-url attribute sets the backend URL.
 *   If omitted, defaults to http://localhost:5000.
 * 
 * WHAT IT TRACKS:
 *   - page_view: automatically on script load
 *   - click: every click with x/y coordinates and viewport size
 * 
 * PRIVACY:
 *   - No cookies, no fingerprinting
 *   - No form data, passwords, or personal information
 *   - Only records: session ID, event type, page URL, timestamp, coordinates
 * 
 * SESSION MANAGEMENT:
 *   - Generates a unique session ID using crypto.randomUUID()
 *   - Persists in localStorage so page reloads stay in the same session
 *   - Falls back to a random ID if crypto API is unavailable
 */

(function () {
  "use strict";

  // ============================================================
  // Configuration
  // ============================================================

  // Read the backend URL from the script tag's data attribute
  // This allows different pages to point to different backends
  const scriptTag = document.currentScript;
  const API_URL = (scriptTag && scriptTag.getAttribute("data-api-url"))
    || "http://localhost:5000";

  const EVENTS_ENDPOINT = API_URL + "/api/events";

  // ============================================================
  // Session Management
  // ============================================================

  const SESSION_KEY = "analytics_session_id";

  /**
   * Generate a unique session ID.
   * Uses crypto.randomUUID() (available in modern browsers over HTTPS and localhost).
   * Falls back to a timestamp + random string if unavailable.
   */
  function generateSessionId() {
    try {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return "sess_" + crypto.randomUUID();
      }
    } catch (e) {
      // Fallback below
    }
    // Fallback: timestamp + random hex
    var hex = Math.random().toString(16).substring(2, 10);
    return "sess_" + Date.now().toString(36) + "_" + hex;
  }

  /**
   * Get or create the session ID.
   * Persists in localStorage so repeat visits use the same session.
   */
  function getSessionId() {
    try {
      var stored = localStorage.getItem(SESSION_KEY);
      if (stored) return stored;

      var newId = generateSessionId();
      localStorage.setItem(SESSION_KEY, newId);
      return newId;
    } catch (e) {
      // localStorage unavailable (private browsing, storage full, etc.)
      // Generate a new ID for this page load only
      return generateSessionId();
    }
  }

  var sessionId = getSessionId();

  // ============================================================
  // Event Sending
  // ============================================================

  /**
   * Send an event to the backend.
   * Uses navigator.sendBeacon for reliability (sends even on page unload),
   * falls back to fetch.
   * Never throws — failed sends are silently ignored to avoid crashing the page.
   */
  function sendEvent(eventData) {
    var payload = JSON.stringify(eventData);

    try {
      // sendBeacon is fire-and-forget — ideal for analytics
      if (typeof navigator.sendBeacon === "function") {
        var blob = new Blob([payload], { type: "application/json" });
        var sent = navigator.sendBeacon(EVENTS_ENDPOINT, blob);
        if (sent) return;
      }
    } catch (e) {
      // Fall through to fetch
    }

    // Fallback: use fetch (async, won't block the page)
    try {
      fetch(EVENTS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true, // allows the request to outlive the page
      }).catch(function () {
        // Silently ignore — we don't want to crash the host page
      });
    } catch (e) {
      // Silently ignore
    }
  }

  // ============================================================
  // Page View Tracking
  // ============================================================

  /**
   * Record a page_view event immediately when the script loads.
   */
  function trackPageView() {
    sendEvent({
      session_id: sessionId,
      event_type: "page_view",
      page_url: window.location.href,
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

  /**
   * Record a click event with coordinates and viewport dimensions.
   * Uses event delegation on the document — one listener covers everything.
   * 
   * We use clientX/clientY (relative to the viewport) because the heatmap
   * will be rendered at the viewport scale. The viewport dimensions are
   * included so clicks can be normalised to any display size.
   */
  function trackClick(event) {
    sendEvent({
      session_id: sessionId,
      event_type: "click",
      page_url: window.location.href,
      timestamp: new Date().toISOString(),
      x: event.clientX,
      y: event.clientY,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
    });
  }

  // ============================================================
  // Initialisation
  // ============================================================

  // Guard: only initialise once even if the script is loaded twice
  if (window.__analytics_tracker_loaded) return;
  window.__analytics_tracker_loaded = true;

  // Track page view on load
  trackPageView();

  // Track clicks — single listener on document, handles all clicks
  document.addEventListener("click", trackClick, { passive: true });
})();
