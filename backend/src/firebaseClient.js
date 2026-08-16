const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();

const serviceAccount = require('../firebase-service-account.json');

const app = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(app);

module.exports = { db };