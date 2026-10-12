import React from 'react';

export default function Navbar({ activeTab, setActiveTab, healthStatus, onRefresh }) {
  return (
    <header className="navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <div className="brand-logo">
            <span className="logo-spark">✦</span>
          </div>
          <div>
            <h1 className="brand-title">CausalPulse</h1>
            <span className="brand-subtitle">User Interaction Analytics</span>
          </div>
        </div>

        <nav className="nav-tabs" aria-label="Main Navigation">
          <button
            id="tab-overview"
            className={`nav-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span className="tab-icon">📊</span>
            Overview
          </button>
          <button
            id="tab-sessions"
            className={`nav-tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => setActiveTab('sessions')}
          >
            <span className="tab-icon">👥</span>
            Sessions & Journeys
          </button>
          <button
            id="tab-heatmap"
            className={`nav-tab-btn ${activeTab === 'heatmap' ? 'active' : ''}`}
            onClick={() => setActiveTab('heatmap')}
          >
            <span className="tab-icon">🔥</span>
            Click Heatmaps
          </button>
        </nav>

        <div className="nav-actions">
          <a
            href="http://localhost:5500/demo/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="demo-link-btn"
            title="Open Demo Site in new tab"
          >
            ↗ Open Demo Site
          </a>

          <button
            className="refresh-btn"
            onClick={onRefresh}
            title="Refresh analytics data"
            id="btn-global-refresh"
          >
            ↻ Refresh
          </button>

          <div
            className={`health-badge ${
              healthStatus === 'healthy' ? 'health-ok' : 'health-bad'
            }`}
            title={`API Status: ${healthStatus}`}
          >
            <span className="health-dot"></span>
            <span className="health-text">
              {healthStatus === 'healthy' ? 'API Live' : 'API Offline'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
