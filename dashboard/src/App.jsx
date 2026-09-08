import { useEffect, useState } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
} from 'firebase/firestore';

import { db } from './firebase';
import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './LoginPage';
import './App.css';
import AlertMap from './AlertMap';

// ============================================================
// AUTH GATE — wraps the whole dashboard
// ============================================================
function AuthGate() {
  const { user, loading, logout } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginPage />;
  return <Dashboard user={user} logout={logout} />;
}

// ============================================================
// LOADING SCREEN
// ============================================================
function LoadingScreen() {
  return (
    <div className="auth-loading">
      <div className="auth-loading-inner">
        <span className="auth-loading-shield">🛡️</span>
        <h2>SheShield</h2>
        <div className="auth-spinner" aria-label="Loading dashboard" />
        <p>Verifying authentication…</p>
      </div>
    </div>
  );
}

// ============================================================
// MAIN DASHBOARD
// ============================================================
function Dashboard({ user, logout }) {
  const [alerts, setAlerts] = useState([]);
  const [guardianSessions, setGuardianSessions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'alerts'), orderBy('created_at', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setAlerts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'guardian_sessions'), where('status', '==', 'active'));
    return onSnapshot(q, (snapshot) => {
      setGuardianSessions(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const activeAlerts = alerts.filter((a) => a.status === 'active').length;
  const resolvedAlerts = alerts.filter((a) => a.status === 'resolved').length;
  const totalAlerts = alerts.length;
  const activeGuardians = guardianSessions.length;

  async function handleLogout() {
    if (!window.confirm('Sign out of the ICCC Dashboard?')) return;
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <div className="dashboard-root">
      {/* ─── HEADER ─── */}
      <div className="dashboard-header">
        <div>
          <div className="brand-row">
            <span className="shield-icon">🛡️</span>
            <h1>SheShield</h1>
            <span className="dashboard-label">ICCC DASHBOARD</span>
          </div>
          <p className="dashboard-subtitle">
            Integrated Command &amp; Control · Real-Time Women Safety Monitoring
          </p>
        </div>

        <div className="header-right">
          <div className="system-status">
            <span className="status-dot" />
            SYSTEM ONLINE
          </div>
          <div className="user-info">
            <span className="user-email" title={user.email}>{user.email}</span>
            <button
              id="logout-btn"
              className="logout-btn"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label="Sign out"
            >
              {loggingOut ? <span className="btn-spinner" /> : '⏏ Sign Out'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── STATS GRID ─── */}
      <div className="stats-grid">
        <div className="stat-card active-card">
          <div className="stat-icon">🚨</div>
          <div className="stat-info">
            <div className="stat-label">ACTIVE</div>
            <div className="stat-number">{activeAlerts}</div>
            <div className="stat-description">Emergencies</div>
          </div>
        </div>
        <div className="stat-card guardian-card">
          <div className="stat-icon">🛡️</div>
          <div className="stat-info">
            <div className="stat-label">GUARDIAN</div>
            <div className="stat-number">{activeGuardians}</div>
            <div className="stat-description">Active Sessions</div>
          </div>
        </div>
        <div className="stat-card total-card">
          <div className="stat-icon">📍</div>
          <div className="stat-info">
            <div className="stat-label">TOTAL</div>
            <div className="stat-number">{totalAlerts}</div>
            <div className="stat-description">Incidents</div>
          </div>
        </div>
        <div className="stat-card resolved-card">
          <div className="stat-icon">✓</div>
          <div className="stat-info">
            <div className="stat-label">RESOLVED</div>
            <div className="stat-number">{resolvedAlerts}</div>
            <div className="stat-description">Cases</div>
          </div>
        </div>
      </div>

      {/* ─── GUARDIAN SESSIONS ─── */}
      <div className="section-block">
        <h2 className="section-title">🛡️ Active Guardian Sessions</h2>
        {guardianSessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛡️</div>
            <p className="empty-title">No active Guardian sessions</p>
            <span className="empty-sub">Guardian Mode sessions will appear here in real-time.</span>
          </div>
        ) : (
          <div className="guardian-grid">
            {guardianSessions.map((session) => (
              <GuardianCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>

      {/* ─── INCIDENT MONITORING ─── */}
      <div className="incident-section">
        <div className="section-heading">
          <div>
            <h2>🚨 Emergency Monitoring</h2>
            <p>Live incidents and geographical overview</p>
          </div>
          <span className="live-badge">● LIVE</span>
        </div>

        <div className="incident-layout">
          {/* MAP */}
          <div className="map-panel">
            <div className="panel-header">
              <div>
                <h3>🗺️ Live Incident Map</h3>
                <span>Real-time location monitoring</span>
              </div>
              <div className="map-controls">
                <button className="focus-all-button" onClick={() => setSelectedLocation(null)}>
                  ⛶ Focus All
                </button>
                <span className="map-status">● LIVE</span>
              </div>
            </div>
            <AlertMap alerts={alerts} guardianSessions={guardianSessions} selectedLocation={selectedLocation} />
          </div>

          {/* ALERT LIST */}
          <div className="alerts-panel">
            <div className="panel-header">
              <div>
                <h3>Emergency Alerts</h3>
                <span>Latest incidents</span>
              </div>
              <span className="alert-count">{activeAlerts} ACTIVE</span>
            </div>

            <div className="alert-list">
              {alerts.length === 0 ? (
                <div className="empty-alerts">
                  <div>✓</div>
                  <p>No emergency alerts</p>
                  <span>System is monitoring for incidents.</span>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`alert-item ${alert.status === 'active' ? 'alert-active' : 'alert-resolved'}`}
                    onClick={() => {
                      if (alert.latitude !== undefined && alert.longitude !== undefined) {
                        setSelectedLocation({ latitude: alert.latitude, longitude: alert.longitude });
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedLocation({ latitude: alert.latitude, longitude: alert.longitude })}
                  >
                    <div className="alert-top">
                      <div className="alert-status">
                        <span className={`alert-dot ${alert.status === 'active' ? 'dot-active' : 'dot-resolved'}`} />
                        <strong>{alert.status?.toUpperCase() || 'UNKNOWN'}</strong>
                      </div>
                      <span className="trigger-type">{alert.trigger_type || 'Emergency'}</span>
                    </div>

                    <div className="alert-body">
                      <div className="alert-user">👤 {alert.user_id || 'Unknown User'}</div>
                      <div className="alert-location">
                        📍{' '}
                        {alert.latitude !== undefined && alert.longitude !== undefined
                          ? `${Number(alert.latitude).toFixed(5)}, ${Number(alert.longitude).toFixed(5)}`
                          : 'Location unavailable'}
                      </div>
                      {alert.nearest_police && (
                        <div className="resource-info">🚔 {alert.nearest_police.name}</div>
                      )}
                      {alert.nearest_hospital && (
                        <div className="resource-info">🏥 {alert.nearest_hospital.name}</div>
                      )}
                    </div>

                    <button
                      className="view-map-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (alert.latitude !== undefined && alert.longitude !== undefined) {
                          window.open(`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`, '_blank');
                        }
                      }}
                    >
                      📍 View on Google Maps
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// GUARDIAN CARD
// ============================================================
function GuardianCard({ session }) {
  const [remainingSeconds, setRemainingSeconds] = useState(getRemainingSeconds(session.expiresAt));

  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds(getRemainingSeconds(session.expiresAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [session.expiresAt]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isLow = remainingSeconds < 300;

  return (
    <div className="guardian-card-item">
      <div className="guardian-card-header">
        <span className="guardian-live-badge">🟢 GUARDIAN MODE ACTIVE</span>
        <span className="guardian-live-pill">LIVE</span>
      </div>
      <div className="guardian-details">
        <p><strong>User:</strong> {session.userId}</p>
        <p><strong>Guardian:</strong> {session.guardianName}</p>
        <p><strong>Phone:</strong> {session.guardianPhone}</p>
      </div>
      <div className="guardian-location-box">
        <h4>📍 Live Location</h4>
        <p>Latitude: {Number(session.latitude).toFixed(6)}</p>
        <p>Longitude: {Number(session.longitude).toFixed(6)}</p>
        <p className="guardian-update-time">Last updated: {formatDate(session.lastLocationUpdate)}</p>
      </div>
      <div className="guardian-timer-box">
        <div className="guardian-timer-label">TIME REMAINING</div>
        <div className={`guardian-timer ${isLow ? 'guardian-timer-low' : ''}`}>{formattedTime}</div>
      </div>
      <button
        className="guardian-map-btn"
        onClick={() => window.open(`https://www.google.com/maps?q=${session.latitude},${session.longitude}`, '_blank')}
      >
        📍 View Location on Map
      </button>
    </div>
  );
}

function getRemainingSeconds(expiresAt) {
  if (!expiresAt) return 0;
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

function formatDate(date) {
  if (!date) return 'Unknown';
  return new Date(date).toLocaleString();
}

// ============================================================
// ROOT EXPORT — wraps with AuthProvider
// ============================================================
export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}