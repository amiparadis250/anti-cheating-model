import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {rooms as defaultRooms, users} from '../src/data/defaults.js';
import {createFileStore} from './stores/file.js';
import {createPostgresStore} from './stores/postgres.js';
import {evaluate, RULES} from './escalation.js';

const STATUSES = ['Pending', 'Reviewed', 'Dismissed', 'Escalated'];
const ROOM_STATUSES = ['Monitoring', 'Standby'];
const text = (value, max = 120) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const count = value => Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 5000 ? Number(value) : null;

export async function seedRooms(store) {
  const fresh = (await store.listRooms()).length === 0 && (await store.listAlerts()).length === 0 && (await store.listSessions()).length === 0;
  if (fresh) for (const room of defaultRooms) await store.insertRoom(room);
}

const wrap = handler => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

export function createApp(store) {
  const app = express();
  app.use(cors());
  app.use(express.json({limit: '100kb'}));

  app.get('/api/health', (_req, res) => res.json({ok: true, store: store.name}));
  app.get('/api/config', (_req, res) => res.json({store: store.name, rules: RULES}));
  app.get('/api/rooms', wrap(async (_req, res) => res.json(await store.listRooms())));
  app.post('/api/rooms', wrap(async (req, res) => {
    const name = text(req.body?.name, 80);
    if (!name) return res.status(400).json({error: 'Room name is required'});
    const candidates = count(req.body?.candidates ?? 0);
    if (candidates === null) return res.status(400).json({error: 'Candidates must be a whole number'});
    const status = ROOM_STATUSES.includes(req.body?.status) ? req.body.status : 'Standby';
    try {
      const room = await store.insertRoom({id: `RM-${crypto.randomBytes(3).toString('hex').toUpperCase()}`, name, school: text(req.body?.school), candidates, status, cameras: 1, assignedTo: text(req.body?.assignedTo) || null});
      res.status(201).json(room);
    } catch (error) {
      if (error.code === '23505') return res.status(409).json({error: 'A room with that name already exists'});
      throw error;
    }
  }));
  app.patch('/api/rooms/:id', wrap(async (req, res) => {
    const patch = {};
    if (req.body?.school !== undefined) patch.school = text(req.body.school);
    if (req.body?.assignedTo !== undefined) patch.assignedTo = text(req.body.assignedTo) || null;
    if (req.body?.candidates !== undefined) {
      patch.candidates = count(req.body.candidates);
      if (patch.candidates === null) return res.status(400).json({error: 'Candidates must be a whole number'});
    }
    if (req.body?.status !== undefined) {
      if (!ROOM_STATUSES.includes(req.body.status)) return res.status(400).json({error: 'Invalid status'});
      patch.status = req.body.status;
    }
    const room = await store.updateRoom(req.params.id, patch);
    if (!room) return res.status(404).json({error: 'Room not found'});
    res.json(room);
  }));
  app.delete('/api/rooms/:id', wrap(async (req, res) => {
    if (!(await store.deleteRoom(req.params.id))) return res.status(404).json({error: 'Room not found'});
    res.status(204).end();
  }));
  app.get('/api/users', (_req, res) => res.json(users));

  app.get('/api/alerts', wrap(async (_req, res) => res.json(await store.listAlerts())));
  app.post('/api/alerts', wrap(async (req, res) => {
    const a = req.body || {};
    if (!a.id || !a.room || !a.model) return res.status(400).json({error: 'id, room and model are required'});
    const alert = await store.insertAlert(a);
    if (!alert) return res.status(409).json({error: 'Alert already exists'});
    const notification = await evaluate(store, alert);
    res.status(201).json({...alert, notification});
  }));
  app.patch('/api/alerts/:id', wrap(async (req, res) => {
    if (!STATUSES.includes(req.body?.status)) return res.status(400).json({error: 'Invalid status'});
    const reviewer = typeof req.body.reviewedBy === 'string' ? req.body.reviewedBy.slice(0, 80) : null;
    const alert = await store.updateAlertStatus(req.params.id, req.body.status, reviewer);
    if (!alert) return res.status(404).json({error: 'Alert not found'});
    res.json(alert);
  }));

  app.get('/api/notifications', wrap(async (_req, res) => res.json(await store.listNotifications())));
  app.post('/api/notifications/read', wrap(async (req, res) => {
    await store.markNotificationsRead(Number(req.body?.id) || null);
    res.status(204).end();
  }));

  app.get('/api/sessions', wrap(async (_req, res) => res.json(await store.listSessions())));
  app.post('/api/sessions', wrap(async (req, res) => {
    const {name, date, start, end, rooms: sessionRooms} = req.body || {};
    if (!name?.trim() || !date || !start || !end) return res.status(400).json({error: 'name, date, start and end are required'});
    if (end <= start) return res.status(400).json({error: 'End time must be after start time'});
    const session = await store.insertSession({
      id: `SE-${Date.now().toString(36).toUpperCase()}`, name: name.trim(), date, start, end,
      rooms: Array.isArray(sessionRooms) ? sessionRooms : [],
    });
    res.status(201).json(session);
  }));
  app.delete('/api/sessions/:id', wrap(async (req, res) => {
    if (!(await store.deleteSession(req.params.id))) return res.status(404).json({error: 'Session not found'});
    res.status(204).end();
  }));

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({error: 'Server error'});
  });
  return app;
}

async function openStore() {
  if (process.env.DATABASE_URL) {
    try {
      return await createPostgresStore(process.env.DATABASE_URL);
    } catch (error) {
      console.error(`Could not connect to Postgres: ${error.message}`);
      console.error('Check DATABASE_URL in .env, or remove it to use the local file store.');
      process.exit(1);
    }
  }
  console.warn('DATABASE_URL is not set: using the local file store (server/data/db.json). Set it to use Postgres.');
  return createFileStore(path.join(path.dirname(fileURLToPath(import.meta.url)), 'data'));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const store = await openStore();
  await seedRooms(store);
  const PORT = Number(process.env.PORT) || 8000;
  createApp(store).listen(PORT, () => console.log(`Ukuri API on http://localhost:${PORT} (store: ${store.name})`));
}
