const express = require('express');
const axios = require('axios');
const { db } = require('../firebaseClient');
const { FieldValue } = require('firebase-admin/firestore');

const router = express.Router();

// ============================================================
// TRIGGER SOS
// POST /api/alerts/trigger
// ============================================================

router.post('/trigger', async (req, res) => {
  try {
    const {
      user_id,
      trigger_type,
      latitude,
      longitude
    } = req.body;

    if (
      !user_id ||
      !trigger_type ||
      latitude == null ||
      longitude == null
    ) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    // --------------------------------------------------------
    // 1. Find nearest police station and hospital
    // --------------------------------------------------------

    const [police, hospital] = await Promise.all([
      findNearest(latitude, longitude, 'police'),
      findNearest(latitude, longitude, 'hospital')
    ]);

    // --------------------------------------------------------
    // 2. Create emergency alert
    // --------------------------------------------------------

    const alertRef = await db.collection('alerts').add({

      user_id,
      trigger_type,

      latitude: Number(latitude),
      longitude: Number(longitude),

      nearest_police: police,
      nearest_hospital: hospital,

      status: 'active',

      // Location history starts with initial SOS position
      location_history: [
        {
          latitude: Number(latitude),
          longitude: Number(longitude),
          timestamp: new Date().toISOString()
        }
      ],

      created_at: FieldValue.serverTimestamp(),

      last_location_update: new Date().toISOString()
    });

    const alertSnap = await alertRef.get();
    const alert = {
      id: alertRef.id,
      ...alertSnap.data()
    };

    // --------------------------------------------------------
    // 3. Notify emergency contacts
    // --------------------------------------------------------

    const contactsSnap = await db
      .collection('contacts')
      .where('user_id', '==', user_id)
      .get();

    const contacts = contactsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data()
    }));

    contacts.forEach((c) => {

      console.log(
        `[ALERT] Notifying ${c.name} (${c.phone}) — alert ${alert.id}`
      );
    });

    // --------------------------------------------------------
    // 4. Response
    // --------------------------------------------------------

    res.status(201).json({
      alert,
      alertId: alertRef.id,
      notified: contacts.length,
      message: 'Emergency alert created successfully'
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({
      error: 'Failed to trigger alert'
    });
  }
});


// ============================================================
// UPDATE LIVE SOS LOCATION
// POST /api/alerts/location
// ============================================================

router.post('/location', async (req, res) => {

  try {

    const {
      alertId,
      latitude,
      longitude
    } = req.body;

    // --------------------------------------------------------
    // Validate
    // --------------------------------------------------------

    if (
      !alertId ||
      latitude == null ||
      longitude == null
    ) {

      return res.status(400).json({
        success: false,
        error: 'alertId, latitude and longitude are required'
      });

    }

    // --------------------------------------------------------
    // Get alert
    // --------------------------------------------------------

    const alertRef = db
      .collection('alerts')
      .doc(alertId);

    const alertDoc = await alertRef.get();

    if (!alertDoc.exists) {

      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });

    }

    const alert = alertDoc.data();

    // --------------------------------------------------------
    // Make sure alert is still active
    // --------------------------------------------------------

    if (alert.status !== 'active') {

      return res.status(400).json({
        success: false,
        error: 'Alert is no longer active'
      });

    }

    const now = new Date().toISOString();

    // --------------------------------------------------------
    // Add new location to history
    // --------------------------------------------------------

    await alertRef.update({

      latitude: Number(latitude),

      longitude: Number(longitude),

      last_location_update: now,

      location_history: FieldValue.arrayUnion({

        latitude: Number(latitude),

        longitude: Number(longitude),

        timestamp: now

      })

    });

    res.json({

      success: true,

      message: 'SOS location updated',

      alertId,

      latitude: Number(latitude),

      longitude: Number(longitude),

      updatedAt: now

    });

  } catch (error) {

    console.error(
      'Alert location update error:',
      error
    );

    res.status(500).json({

      success: false,

      error: error.message

    });

  }

});


// ============================================================
// RESOLVE SOS
// POST /api/alerts/resolve
// ============================================================

router.post('/resolve', async (req, res) => {

  try {

    const { alertId } = req.body;

    if (!alertId) {

      return res.status(400).json({
        success: false,
        error: 'alertId is required'
      });

    }

    const alertRef = db
      .collection('alerts')
      .doc(alertId);

    const alertDoc = await alertRef.get();

    if (!alertDoc.exists) {

      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });

    }

    const now = new Date().toISOString();

    await alertRef.update({

      status: 'resolved',

      resolved_at: now

    });

    res.json({

      success: true,

      message: 'Emergency alert resolved',

      alertId,

      status: 'resolved'

    });

  } catch (error) {

    console.error(
      'Alert resolve error:',
      error
    );

    res.status(500).json({

      success: false,

      error: error.message

    });

  }

});


// ============================================================
// FIND NEAREST POLICE / HOSPITAL
// ============================================================

async function findNearest(lat, lng, type) {

  try {

    const { data } = await axios.get(
      'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
      {
        params: {

          location: `${lat},${lng}`,

          rankby: 'distance',

          type,

          key: process.env.GOOGLE_MAPS_API_KEY

        }
      }
    );

    console.log(
      `[Maps ${type}] status:`,
      data.status,
      data.error_message || ''
    );

    const nearest = data.results?.[0];

    return nearest
      ? {
          name: nearest.name,

          address: nearest.vicinity,

          location:
            nearest.geometry?.location
        }
      : null;

  } catch (err) {

    console.error(
      `Nearby ${type} lookup failed:`,
      err.message
    );

    return null;

  }

}

module.exports = router;