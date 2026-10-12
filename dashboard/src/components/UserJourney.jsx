import React from 'react';

export default function UserJourney({ sessionId, events, loading, error, onClose }) {
  if (!sessionId) {
    return (
      <div className="card-panel journey-placeholder">
        <span className="placeholder-icon">🧭</span>
        <h3>No Session Selected</h3>
        <p>Click on any session in the table to inspect its chronological event journey.</p>
      </div>
    );
  }

  return (
    <div className="card-panel user-journey-panel" id="user-journey-view">
      <div className="journey-header">
        <div>
          <span className="panel-badge">SESSION JOURNEY</span>
          <h2 className="panel-title">
            <code className="session-highlight">{sessionId}</code>
          </h2>
          <p className="panel-subtitle">
            Chronological audit of all visitor interactions in this session
          </p>
        </div>
        {onClose && (
          <button className="btn-close-journey" onClick={onClose} title="Deselect session">
            ✕ Close
          </button>
        )}
      </div>

      {loading && (
        <div className="state-card loading-state">
          <div className="spinner"></div>
          <p>Retrieving session events...</p>
        </div>
      )}

      {error && (
        <div className="state-card error-state">
          <span className="state-icon">⚠️</span>
          <h3>Could not load journey</h3>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && events && events.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <h3>No events found</h3>
          <p>This session has no recorded events.</p>
        </div>
      )}

      {!loading && !error && events && events.length > 0 && (
        <div className="timeline-container">
          <div className="timeline-summary-bar">
            <span>Total Events: <strong>{events.length}</strong></span>
            <span>
              Page Views: <strong>{events.filter((e) => e.event_type === 'page_view').length}</strong>
            </span>
            <span>
              Clicks: <strong>{events.filter((e) => e.event_type === 'click').length}</strong>
            </span>
          </div>

          <div className="timeline-stream">
            {events.map((event, index) => {
              const isClick = event.event_type === 'click';
              const eventDate = new Date(event.timestamp);

              return (
                <div
                  key={`${event.timestamp}-${index}`}
                  className={`timeline-item ${isClick ? 'item-click' : 'item-pageview'}`}
                >
                  <div className="timeline-marker">
                    <span className="marker-icon">{isClick ? '🖱️' : '📄'}</span>
                  </div>

                  <div className="timeline-content">
                    <div className="timeline-top">
                      <span
                        className={`event-type-badge ${
                          isClick ? 'badge-click' : 'badge-pageview'
                        }`}
                      >
                        Step {index + 1}: {isClick ? 'Click Event' : 'Page Load View'}
                      </span>
                      <span className="timeline-time">
                        {eventDate.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          fractionalSecondDigits: 3,
                        })}
                      </span>
                    </div>

                    <div className="timeline-url">
                      <span className="url-label">Page:</span>
                      <a
                        href={event.page_url}
                        target="_blank"
                        rel="noreferrer"
                        className="url-link"
                      >
                        {event.page_url}
                      </a>
                    </div>

                    {isClick && (
                      <div className="click-details-card">
                        <div className="detail-item">
                          <span className="detail-label">Coordinates:</span>
                          <span className="coord-chip">
                            X: <strong>{event.x}px</strong>, Y: <strong>{event.y}px</strong>
                          </span>
                        </div>
                        {event.viewport_width && (
                          <div className="detail-item">
                            <span className="detail-label">Viewport:</span>
                            <span className="viewport-chip">
                              {event.viewport_width} × {event.viewport_height}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
