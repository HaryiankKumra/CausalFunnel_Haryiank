import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Overview from './components/Overview';
import SessionList from './components/SessionList';
import UserJourney from './components/UserJourney';
import Heatmap from './components/Heatmap';
import {
  getHealth,
  getOverview,
  getSessions,
  getSessionEvents,
} from './api/analytics';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [healthStatus, setHealthStatus] = useState('checking');

  // Overview Data
  const [overviewData, setOverviewData] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [overviewError, setOverviewError] = useState(null);

  // Sessions Data
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionsError, setSessionsError] = useState(null);

  // Selected Session & Journey
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionEvents, setSessionEvents] = useState([]);
  const [loadingJourney, setLoadingJourney] = useState(false);
  const [journeyError, setJourneyError] = useState(null);

  // Auto-refresh interval (every 10s)
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Check backend health
  const checkHealthStatus = useCallback(async () => {
    try {
      const data = await getHealth();
      setHealthStatus(data.status === 'healthy' ? 'healthy' : 'unhealthy');
    } catch {
      setHealthStatus('unhealthy');
    }
  }, []);

  // Fetch overview metrics
  const fetchOverviewData = useCallback(async () => {
    setLoadingOverview(true);
    setOverviewError(null);
    try {
      const data = await getOverview();
      setOverviewData(data);
    } catch (err) {
      setOverviewError(err.message);
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  // Fetch sessions list
  const fetchSessionsData = useCallback(async () => {
    setLoadingSessions(true);
    setSessionsError(null);
    try {
      const data = await getSessions();
      setSessions(data.sessions || []);
    } catch (err) {
      setSessionsError(err.message);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  // Global Refresh Handler
  const handleRefresh = useCallback(() => {
    checkHealthStatus();
    fetchOverviewData();
    fetchSessionsData();
    if (selectedSessionId) {
      handleSelectSession(selectedSessionId);
    }
  }, [checkHealthStatus, fetchOverviewData, fetchSessionsData, selectedSessionId]);

  // Initial load
  useEffect(() => {
    checkHealthStatus();
    fetchOverviewData();
    fetchSessionsData();
  }, [checkHealthStatus, fetchOverviewData, fetchSessionsData]);

  // Periodic polling for real-time dashboard updates
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchOverviewData();
      fetchSessionsData();
      checkHealthStatus();
    }, 8000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchOverviewData, fetchSessionsData, checkHealthStatus]);

  // Fetch journey when a session is selected
  async function handleSelectSession(sessionId) {
    setSelectedSessionId(sessionId);
    setLoadingJourney(true);
    setJourneyError(null);
    try {
      const data = await getSessionEvents(sessionId);
      setSessionEvents(data.events || []);
    } catch (err) {
      setJourneyError(err.message);
      setSessionEvents([]);
    } finally {
      setLoadingJourney(false);
    }
  }

  function handleOverviewSessionClick(sessionId) {
    setActiveTab('sessions');
    handleSelectSession(sessionId);
  }

  return (
    <div className="app-shell">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        healthStatus={healthStatus}
        onRefresh={handleRefresh}
      />

      <main className="main-content">
        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <Overview
            overviewData={overviewData}
            loading={loadingOverview}
            error={overviewError}
            onSelectSession={handleOverviewSessionClick}
          />
        )}

        {/* Tab 2: Sessions & User Journey Split View */}
        {activeTab === 'sessions' && (
          <div className="sessions-view-grid">
            <div className="sessions-table-col">
              <SessionList
                sessions={sessions}
                selectedSessionId={selectedSessionId}
                onSelectSession={handleSelectSession}
                loading={loadingSessions}
                error={sessionsError}
              />
            </div>
            <div className="sessions-journey-col">
              <UserJourney
                sessionId={selectedSessionId}
                events={sessionEvents}
                loading={loadingJourney}
                error={journeyError}
                onClose={() => setSelectedSessionId(null)}
              />
            </div>
          </div>
        )}

        {/* Tab 3: Heatmap View */}
        {activeTab === 'heatmap' && <Heatmap />}
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <span>
            CausalPulse Analytics &mdash; Full Stack Technical Submission
          </span>
          <div className="footer-links">
            <label className="auto-refresh-toggle">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-poll every 8s
            </label>
            <span className="dot-divider">•</span>
            <span>REST API: <code>http://localhost:5000</code></span>
            <span className="dot-divider">•</span>
            <span>MongoDB Atlas</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
