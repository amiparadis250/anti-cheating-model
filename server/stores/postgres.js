import pg from 'pg';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS rooms (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  school       TEXT,
  candidates   INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'Standby',
  cameras      INTEGER NOT NULL DEFAULT 1,
  assigned_to  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alerts (
  id           TEXT PRIMARY KEY,
  room         TEXT NOT NULL,
  type         TEXT,
  model        TEXT NOT NULL,
  confidence   INTEGER,
  priority     TEXT,
  status       TEXT NOT NULL DEFAULT 'Pending',
  detail       TEXT,
  alert_date   TEXT,
  alert_time   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by  TEXT,
  reviewed_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS alerts_room_model_created ON alerts (room, model, created_at DESC);

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  date        TEXT NOT NULL,
  start_time  TEXT NOT NULL,
  end_time    TEXT NOT NULL,
  rooms       JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  level       TEXT NOT NULL,
  kind        TEXT NOT NULL,
  room        TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  read        BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS notifications_room_kind ON notifications (room, kind, created_at DESC);
`;

const toRoom = r => r && ({id: r.id, name: r.name, school: r.school, candidates: r.candidates, status: r.status, cameras: r.cameras, assignedTo: r.assigned_to});
const ROOM_COLUMNS = {school: 'school', candidates: 'candidates', status: 'status', assignedTo: 'assigned_to'};

const toAlert = r => r && ({
  id: r.id, room: r.room, type: r.type, model: r.model, confidence: r.confidence, priority: r.priority,
  status: r.status, detail: r.detail, date: r.alert_date, time: r.alert_time,
  createdAt: r.created_at, reviewedBy: r.reviewed_by, reviewedAt: r.reviewed_at,
});
const toSession = r => r && ({id: r.id, name: r.name, date: r.date, start: r.start_time, end: r.end_time, rooms: r.rooms});
const toNotification = r => r && ({id: r.id, level: r.level, kind: r.kind, room: r.room, title: r.title, message: r.message, createdAt: r.created_at, read: r.read});

export async function createPostgresStore(connectionString) {
  const pool = new pg.Pool({connectionString});
  await pool.query(SCHEMA);
  const q = async (text, params) => (await pool.query(text, params)).rows;
  const one = async (text, params) => (await q(text, params))[0] || null;

  return {
    name: 'postgres',
    close: () => pool.end(),

    async listRooms() { return (await q('SELECT * FROM rooms ORDER BY name')).map(toRoom); },
    async insertRoom(r) {
      return toRoom(await one(
        'INSERT INTO rooms (id, name, school, candidates, status, cameras, assigned_to) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
        [r.id, r.name, r.school ?? null, r.candidates ?? 0, r.status || 'Standby', r.cameras ?? 1, r.assignedTo ?? null],
      ));
    },
    async updateRoom(id, patch) {
      const keys = Object.keys(patch).filter(k => ROOM_COLUMNS[k] && patch[k] !== undefined);
      if (keys.length === 0) return toRoom(await one('SELECT * FROM rooms WHERE id=$1', [id]));
      const sets = keys.map((k, i) => `${ROOM_COLUMNS[k]} = $${i + 2}`).join(', ');
      return toRoom(await one(`UPDATE rooms SET ${sets} WHERE id = $1 RETURNING *`, [id, ...keys.map(k => patch[k])]));
    },
    async deleteRoom(id) { return (await pool.query('DELETE FROM rooms WHERE id=$1', [id])).rowCount > 0; },

    async listAlerts() { return (await q('SELECT * FROM alerts ORDER BY created_at DESC LIMIT 2000')).map(toAlert); },
    async insertAlert(a) {
      return toAlert(await one(
        `INSERT INTO alerts (id, room, type, model, confidence, priority, status, detail, alert_date, alert_time)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING RETURNING *`,
        [a.id, a.room, a.type ?? null, a.model, a.confidence ?? null, a.priority ?? null, a.status || 'Pending', a.detail ?? null, a.date ?? null, a.time ?? null],
      ));
    },
    async updateAlertStatus(id, status, reviewedBy) {
      return toAlert(await one('UPDATE alerts SET status=$2, reviewed_by=$3, reviewed_at=now() WHERE id=$1 RETURNING *', [id, status, reviewedBy ?? null]));
    },
    async countAlerts(room, model, since) {
      return (await one('SELECT count(*)::int AS n FROM alerts WHERE room=$1 AND model=$2 AND created_at >= $3', [room, model, since])).n;
    },

    async listSessions() { return (await q('SELECT * FROM sessions ORDER BY date, start_time')).map(toSession); },
    async insertSession(s) {
      return toSession(await one(
        'INSERT INTO sessions (id, name, date, start_time, end_time, rooms) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
        [s.id, s.name, s.date, s.start, s.end, JSON.stringify(s.rooms)],
      ));
    },
    async deleteSession(id) { return (await pool.query('DELETE FROM sessions WHERE id=$1', [id])).rowCount > 0; },

    async listNotifications(limit = 50) { return (await q('SELECT * FROM notifications ORDER BY created_at DESC LIMIT $1', [limit])).map(toNotification); },
    async insertNotification(n) {
      return toNotification(await one(
        'INSERT INTO notifications (level, kind, room, title, message) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [n.level, n.kind, n.room, n.title, n.message],
      ));
    },
    async lastNotification(room, kind, since) {
      return toNotification(await one('SELECT * FROM notifications WHERE room=$1 AND kind=$2 AND created_at >= $3 ORDER BY created_at DESC LIMIT 1', [room, kind, since]));
    },
    async markNotificationsRead(id) {
      if (id) await pool.query('UPDATE notifications SET read=true WHERE id=$1', [id]);
      else await pool.query('UPDATE notifications SET read=true WHERE read=false');
    },
  };
}
