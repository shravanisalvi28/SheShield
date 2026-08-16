const express = require('express');
const axios = require('axios');
const { db } = require('../firebaseClient');
const { FieldValue } = require('firebase-admin/firestore');

const router = express.Router();

router.post('/trigger', async (req, res) => {
  try {
    const { user_id, trigger_type, latitude, longitude } = req.body;

    if (!user_id || !trigger_type || latitude == null || longitude == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Find nearest police station & hospital
    const [police, hospital] = await Promise.all([
      findNearest(latitude, longitude, 'police'),
      findNearest(latitude, longitude, 'hospital'),
    ]);

    // 2. Create the alert
    const alertRef = await db.collection('alerts').add({
      user_id,
      trigger_type,
      latitude,
      longitude,
      nearest_police: police,
      nearest_hospital: hospital,
      status: 'active',
      created_at: FieldValue.serverTimestamp(),
    });
    const alertSnap = await alertRef.get();
    const alert = { id: alertRef.id, ...alertSnap.data() };

    // 3. Look up + "notify" emergency contacts
    const contactsSnap = await db.collection('contacts').where('user_id', '==', user_id).get();
    const contacts = contactsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    contacts.forEach((c) => {
      console.log(`[ALERT] Notifying ${c.name} (${c.phone}) — alert ${alert.id}`);
    });

    res.status(201).json({ alert, notified: contacts.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to trigger alert' });
  }
});

async function findNearest(lat, lng, type) {
  try {
    const { data } = await axios.get(
      'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
      {
        params: {
          location: `${lat},${lng}`,
          rankby: 'distance',
          type,
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
      }
    );

    // Log Google's actual status — this tells us the real reason
    console.log(`[Maps ${type}] status: ${data.status}`, data.error_message || '');

    const nearest = data.results?.[0];
    return nearest
      ? { name: nearest.name, address: nearest.vicinity, location: nearest.geometry?.location }
      : null;
  } catch (err) {
    console.error(`Nearby ${type} lookup failed:`, err.message);
    return null;
  }
}

module.exports = router;