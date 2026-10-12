import React, { useState } from 'react';

export default function SessionList({
  sessions,
  selectedSessionId,
  onSelectSession,
  loading,
  error,
}) {
  const [searchTerm, setSearchTerm] = useState('');

  if (loading) {
    return (
      <div className="state-card loading-state">
        <div className="spinner"></div>
        <p>Loading user sessions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="state-card error-state">
        <span className="state-icon">⚠️</span>
        <h3>Error loading sessions</h3>
        <p>{error}</p>
      </div>
    );
  }

  const filtered = (sessions || []).filter((s) =>
    s.session_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="session-list-container">
      <div className="session-header-row">
        <div>
          <h2 className="panel-title">Tracked Sessions ({sessions.length})</h2>
          <p className="panel-subtitle">Select any session to view its chronological event timeline</p>
        </div>
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by session ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            id="session-search-input"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📂</span>
          <h3>{searchTerm ? 'No matching sessions' : 'No sessions recorded yet'}</h3>
          <p>
            {searchTerm
              ? 'Try modifying your search term.'
              : 'Interact with the demo page to start recording distinct user sessions.'}
          </p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table sessions-table">
            <thead>
              <tr>
                <th>Session Identifier</th>
                <th>Total Events</th>
                <th>Page Views</th>
                <th>Clicks</th>
                <th>Last Active</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((session) => {
                const isSelected = session.session_id === selectedSessionId;
                const lastActiveFormatted = new Date(session.last_activity).toLocaleString();

                return (
                  <tr
                    key={session.session_id}
                    className={`session-row ${isSelected ? 'row-selected' : ''}`}
                    onClick={() => onSelectSession(session.session_id)}
                  >
                    <td>
                      <div className="session-cell-content">
                        <span className={`status-indicator-dot ${isSelected ? 'dot-active' : ''}`}></span>
                        <code className="session-id-pill" title={session.session_id}>
                          {session.session_id}
                        </code>
                      </div>
                    </td>
                    <td>
                      <span className="count-badge total-badge">{session.total_events}</span>
                    </td>
                    <td>
                      <span className="count-badge pageview-badge">{session.page_views}</span>
                    </td>
                    <td>
                      <span className="count-badge click-badge">{session.clicks}</span>
                    </td>
                    <td className="timestamp-cell">{lastActiveFormatted}</td>
                    <td>
                      <button
                        className={`btn-select ${isSelected ? 'btn-selected' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSession(session.session_id);
                        }}
                      >
                        {isSelected ? '✓ Selected' : 'View Journey →'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
