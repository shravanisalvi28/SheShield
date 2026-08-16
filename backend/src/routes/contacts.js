const express = require('express');
const { db } = require('../firebaseClient');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { user_id, name, phone, email, relationship } = req.body;
    if (!user_id || !name || !phone) {
      return res.status(400).json({ error: 'user_id, name, and phone are required' });
    }
    const ref = await db.collection('contacts').add({ user_id, name, phone, email, relationship });
    const snap = await ref.get();
    res.status(201).json({ id: ref.id, ...snap.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:user_id', async (req, res) => {
  try {
    const snap = await db.collection('contacts').where('user_id', '==', req.params.user_id).get();
    const contacts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;