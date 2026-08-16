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

function App() {
  const [alerts, setAlerts] = useState([]);
  const [guardianSessions, setGuardianSessions] = useState([]);

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

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '24px', background: '#111', minHeight: '100vh', color: '#fff' }}>
      <h1 style={{ color: '#C00000' }}>SheShield — ICCC Dashboard</h1>
      <p>{alerts.length} alert(s) on record</p>

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
        <h2 style={{ color: '#C00000' }}>🚨 Emergency Alerts</h2>
        <div style={{ display: 'grid', gap: '12px', marginTop: '20px' }}>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                background: alert.status === 'active' ? '#3a1010' : '#1a1a1a',
                border: `1px solid ${alert.status === 'active' ? '#C00000' : '#333'}`,
                borderRadius: '8px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ color: alert.status === 'active' ? '#ff5555' : '#aaa' }}>
                  {alert.status?.toUpperCase()}
                </strong>
                <span style={{ color: '#888', fontSize: '13px' }}>{alert.trigger_type}</span>
              </div>
              <p>User: {alert.user_id}</p>
              <p>Location: {alert.latitude?.toFixed(4)}, {alert.longitude?.toFixed(4)}</p>
              {alert.nearest_police && <p>Nearest Police: {alert.nearest_police.name}</p>}
              {alert.nearest_hospital && <p>Nearest Hospital: {alert.nearest_hospital.name}</p>}
            </div>
          ))}
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