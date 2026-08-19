import { useEffect, useState } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
} from 'firebase/firestore';

import { db } from './firebase';
import './App.css';
import AlertMap from "./AlertMap";

function App() {
  const [alerts, setAlerts] = useState([]);
  const [guardianSessions, setGuardianSessions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  useEffect(() => {
    const q = query(collection(db, 'alerts'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAlerts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'guardian_sessions'), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGuardianSessions(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

const activeAlerts = alerts.filter(
  (alert) => alert.status === 'active'
).length;

const resolvedAlerts = alerts.filter(
  (alert) => alert.status === 'resolved'
).length;

const totalAlerts = alerts.length;

const activeGuardians = guardianSessions.length;

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '24px', background: '#111', minHeight: '100vh', color: '#fff' }}>
      <div className="dashboard-header">
  <div>
    <div className="brand-row">
      <span className="shield-icon">🛡️</span>
      <h1>SheShield</h1>
      <span className="dashboard-label">ICCC DASHBOARD</span>
    </div>

    <p className="dashboard-subtitle">
      Integrated Command & Control • Real-Time Women Safety Monitoring
    </p>
  </div>

  <div className="system-status">
    <span className="status-dot"></span>
    SYSTEM ONLINE
  </div>
</div>

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

      <div style={{ marginTop: '35px' }}>
        <h2 style={{ color: '#4CAF50' }}>🛡️ Active Guardian Sessions</h2>
        {guardianSessions.length === 0 ? (
          <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '20px', marginTop: '15px' }}>
            <p style={{ color: '#888' }}>No active Guardian Mode sessions.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '15px', marginTop: '15px' }}>
            {guardianSessions.map((session) => (
              <GuardianCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: '40px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px',
          }}
        >
          <h2 style={{ color: '#C9A24B', margin: 0 }}>
            🗺️ Live Incident Map
          </h2>

          <span
            style={{
              color: '#4CAF50',
              fontSize: '13px',
              fontWeight: 'bold',
            }}
          >
            ● LIVE
          </span>
        </div>

        <AlertMap
          alerts={alerts}
          guardianSessions={guardianSessions}
          selectedLocation={selectedLocation}
        />
      </div>
      <div className="incident-section">

  <div className="section-heading">
    <div>
      <h2>🚨 Emergency Monitoring</h2>
      <p>Live incidents and geographical overview</p>
    </div>

    <span className="live-badge">
      ● LIVE
    </span>
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
    <button
      className="focus-all-button"
      onClick={() => setSelectedLocation(null)}
    >
      ⛶ Focus All
    </button>
    <span className="map-status">
      ● LIVE
    </span>
  </div>
</div>
      <AlertMap
        alerts={alerts}
        guardianSessions={guardianSessions}
      />

    </div>


    {/* ALERT LIST */}
    <div className="alerts-panel">

      <div className="panel-header">
        <div>
          <h3>Emergency Alerts</h3>
          <span>Latest incidents</span>
        </div>

        <span className="alert-count">
          {activeAlerts} ACTIVE
        </span>
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
  className={`alert-item ${
    alert.status === 'active'
      ? 'alert-active'
      : 'alert-resolved'
  }`}
  onClick={() => {
    if (
      alert.latitude !== undefined &&
      alert.longitude !== undefined
    ) {
      setSelectedLocation({
        latitude: alert.latitude,
        longitude: alert.longitude,
      });
    }
  }}
>

              <div className="alert-top">

                <div className="alert-status">

                  <span
                    className={`alert-dot ${
                      alert.status === 'active'
                        ? 'dot-active'
                        : 'dot-resolved'
                    }`}
                  />

                  <strong>
                    {alert.status?.toUpperCase() || 'UNKNOWN'}
                  </strong>

                </div>

                <span className="trigger-type">
                  {alert.trigger_type || 'Emergency'}
                </span>

              </div>


              <div className="alert-body">

                <div className="alert-user">
                  👤 {alert.user_id || 'Unknown User'}
                </div>

                <div className="alert-location">

                  📍

                  {alert.latitude !== undefined &&
                  alert.longitude !== undefined
                    ? `${Number(alert.latitude).toFixed(5)}, ${Number(
                        alert.longitude
                      ).toFixed(5)}`
                    : 'Location unavailable'}

                </div>

                {alert.nearest_police && (
                  <div className="resource-info">
                    🚔 {alert.nearest_police.name}
                  </div>
                )}

                {alert.nearest_hospital && (
                  <div className="resource-info">
                    🏥 {alert.nearest_hospital.name}
                  </div>
                )}

              </div>


              <button
                className="view-map-button"
                onClick={() => {

                  if (
                    alert.latitude !== undefined &&
                    alert.longitude !== undefined
                  ) {

                    window.open(
                      `https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`,
                      '_blank'
                    );

                  }

                }}
              >
                📍 View Location
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

  return (
    <div style={{ background: '#102414', border: '1px solid #2e7d32', borderRadius: '10px', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ color: '#4CAF50', fontSize: '18px' }}>🟢 GUARDIAN MODE ACTIVE</strong>
        <span style={{ background: '#1b5e20', padding: '5px 10px', borderRadius: '15px', fontSize: '13px' }}>LIVE</span>
      </div>

      <div style={{ marginTop: '18px' }}>
        <p><strong>User:</strong> {session.userId}</p>
        <p><strong>Guardian:</strong> {session.guardianName}</p>
        <p><strong>Guardian Phone:</strong> {session.guardianPhone}</p>
      </div>

      <div style={{ background: '#0b1a0d', padding: '15px', borderRadius: '8px', marginTop: '15px' }}>
        <h3 style={{ marginTop: 0 }}>📍 Live Location</h3>
        <p>Latitude: {Number(session.latitude).toFixed(6)}</p>
        <p>Longitude: {Number(session.longitude).toFixed(6)}</p>
        <p style={{ color: '#888', fontSize: '13px' }}>Last updated: {formatDate(session.lastLocationUpdate)}</p>
      </div>

      <div style={{ marginTop: '15px', padding: '15px', background: '#1a1a1a', borderRadius: '8px', textAlign: 'center' }}>
        <div style={{ color: '#888', fontSize: '13px' }}>TIME REMAINING</div>
        <div style={{ fontSize: '30px', fontWeight: 'bold', color: remainingSeconds < 300 ? '#ff5555' : '#4CAF50', marginTop: '5px' }}>
          {formattedTime}
        </div>
      </div>

      <button
        onClick={() => window.open(`https://www.google.com/maps?q=${session.latitude},${session.longitude}`, '_blank')}
        style={{ width: '100%', marginTop: '15px', padding: '12px', border: 'none', borderRadius: '6px', background: '#2e7d32', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
      >
        📍 View Location on Map
      </button>
    </div>
  );
}

function getRemainingSeconds(expiresAt) {
  if (!expiresAt) return 0;
  const expiry = new Date(expiresAt).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((expiry - now) / 1000));
}

function formatDate(date) {
  if (!date) return 'Unknown';
  return new Date(date).toLocaleString();
}

export default App;