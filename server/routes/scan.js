const express = require('express');
const { v4: uuidv4 } = require('uuid');

// In-memory store (ephemeral; for production use a DB/redis)
const sessions = new Map();

// TTL cleanup (optional)
const TTL_MS = 10 * 60 * 1000; // 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions.entries()) {
    if (s.expiresAt <= now) sessions.delete(id);
  }
}, 60 * 1000);

const router = express.Router();

// Create a scan session
router.post('/session', (req, res) => {
  const id = uuidv4();
  const createdAt = Date.now();
  const expiresAt = createdAt + TTL_MS;
  sessions.set(id, { id, status: 'pending', result: null, createdAt, expiresAt });
  res.json({ id, expiresAt });
});

// Get scan session status/result
router.get('/session/:id', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ message: 'Not found' });
  res.json({ id: session.id, status: session.status, result: session.result, expiresAt: session.expiresAt });
});

// Post scan result
router.post('/session/:id/result', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ message: 'Not found' });
  session.status = 'completed';
  session.result = req.body || null;
  sessions.set(session.id, session);
  res.json({ success: true });
});

module.exports = router;


