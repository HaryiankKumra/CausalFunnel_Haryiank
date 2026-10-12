import React from 'react';

export default function Overview({ overviewData, loading, error, onSelectSession }) {
  if (loading) {
    return (
      <div className="state-card loading-state">
        <div className="spinner"></div>
        <p>Loading analytics overview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="state-card error-state">
        <span className="state-icon">⚠️</span>
        <h3>Failed to load metrics</h3>
        <p>{error}</p>
      </div>
    );
  }

  const {
    total_sessions = 0,
    total_events = 0,
    page_views = 0,
    clicks = 0,
    recent_activity = [],
  } = overviewData || {};

  // Engagement metric: Clicks per session or Clicks to Pageview ratio
  const clickThroughRate = page_views > 0 ? ((clicks / page_views) * 100).toFixed(1) : 0;
  const avgEventsPerSession = total_sessions > 0 ? (total_events / total_sessions).toFixed(1) : 0;

  return (
    <div className="overview-container">
      {/* KPI Stats Grid */}
      <section className="stats-grid">
        <div className="stat-card" id="card-total-sessions">
          <div className="stat-header">
            <span className="stat-label">Total Sessions</span>
            <span className="stat-icon-badge badge-purple">👥</span>
          </div>
          <div className="stat-value">{total_sessions.toLocaleString()}</div>
          <div className="stat-subtext">Unique user browsing sessions</div>
        </div>

        <div className="stat-card" id="card-total-events">
          <div className="stat-header">
            <span className="stat-label">Total Events</span>
            <span className="stat-icon-badge badge-blue">⚡</span>
          </div>
          <div className="stat-value">{total_events.toLocaleString()}</div>
          <div className="stat-subtext">~{avgEventsPerSession} events per session</div>
        </div>

        <div className="stat-card" id="card-page-views">
          <div className="stat-header">
            <span className="stat-label">Page Views</span>
            <span className="stat-icon-badge badge-green">📄</span>
          </div>
          <div className="stat-value">{page_views.toLocaleString()}</div>
          <div className="stat-subtext">Initial and repeat page loads</div>
        </div>

        <div className="stat-card" id="card-total-clicks">
          <div className="stat-header">
            <span className="stat-label">Total Clicks</span>
            <span className="stat-icon-badge badge-amber">🖱️</span>
          </div>
          <div className="stat-value">{clicks.toLocaleString()}</div>
          <div className="stat-subtext">{clickThroughRate}% click-to-view engagement</div>
        </div>
      </section>

      {/* Recent Activity Table */}
      <section className="card-panel recent-activity-panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Real-Time Event Stream</h2>
            <p className="panel-subtitle">Latest recorded interactions across all sessions</p>
          </div>
          <span className="live-pill">● LIVE INGESTION</span>
        </div>

        {recent_activity.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🔍</span>
            <h3>No events recorded yet</h3>
            <p>Visit the demo page or trigger clicks to see activity stream here in real time.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>Session ID</th>
                  <th>Page URL</th>
                  <th>Recorded At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recent_activity.map((event, idx) => (
                  <tr key={`${event.session_id}-${event.timestamp}-${idx}`}>
                    <td>
                      <span
                        className={`event-type-badge ${
                          event.event_type === 'click' ? 'badge-click' : 'badge-pageview'
                        }`}
                      >
                        {event.event_type === 'click' ? '🖱️ Click' : '📄 Page View'}
                      </span>
                    </td>
                    <td>
                      <code className="session-id-pill" title={event.session_id}>
                        {event.session_id.length > 20
                          ? `${event.session_id.substring(0, 18)}...`
                          : event.session_id}
                      </code>
                    </td>
                    <td className="url-cell" title={event.page_url}>
                      {event.page_url}
                    </td>
                    <td className="timestamp-cell">
                      {new Date(event.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td>
                      <button
                        className="btn-inspect"
                        onClick={() => onSelectSession(event.session_id)}
                        title="View complete user journey for this session"
                      >
                        Inspect Journey →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
