import fs from 'node:fs';
import path from 'node:path';

export function createFileStore(dir) {
  const file = path.join(dir, 'db.json');
  fs.mkdirSync(dir, {recursive: true});
  let db = {rooms: [], alerts: [], sessions: [], notifications: [], nextNotificationId: 1};
  try { db = {...db, ...JSON.parse(fs.readFileSync(file, 'utf8'))}; } catch { db = {...db}; }

  const save = () => {
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, file);
  };

  return {
    name: 'file',
    close: async () => {},

    async listRooms() { return [...db.rooms].sort((a, b) => a.name.localeCompare(b.name)); },
    async insertRoom(r) {
      if (db.rooms.some(x => x.name === r.name)) throw Object.assign(new Error('duplicate room'), {code: '23505'});
      const room = {cameras: 1, ...r};
      db.rooms.push(room);
      save();
      return room;
    },
    async updateRoom(id, patch) {
      const room = db.rooms.find(r => r.id === id);
      if (!room) return null;
      for (const key of ['school', 'candidates', 'status', 'assignedTo']) if (patch[key] !== undefined) room[key] = patch[key];
      save();
      return room;
    },
    async deleteRoom(id) {
      const before = db.rooms.length;
      db.rooms = db.rooms.filter(r => r.id !== id);
      if (db.rooms.length === before) return false;
      save();
      return true;
    },

    async listAlerts() { return db.alerts; },
    async insertAlert(a) {
      if (db.alerts.some(x => x.id === a.id)) return null;
      const alert = {...a, status: a.status || 'Pending', createdAt: new Date().toISOString()};
      db.alerts.unshift(alert);
      db.alerts = db.alerts.slice(0, 2000);
      save();
      return alert;
    },
    async updateAlertStatus(id, status, reviewedBy) {
      const alert = db.alerts.find(a => a.id === id);
      if (!alert) return null;
      Object.assign(alert, {status, reviewedBy: reviewedBy ?? null, reviewedAt: new Date().toISOString()});
      save();
      return alert;
    },
    async countAlerts(room, model, since) {
      return db.alerts.filter(a => a.room === room && a.model === model && new Date(a.createdAt) >= since).length;
    },

    async listSessions() { return [...db.sessions].sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`)); },
    async insertSession(s) { db.sessions.push(s); save(); return s; },
    async deleteSession(id) {
      const before = db.sessions.length;
      db.sessions = db.sessions.filter(s => s.id !== id);
      if (db.sessions.length === before) return false;
      save();
      return true;
    },

    async listNotifications(limit = 50) { return db.notifications.slice(0, limit); },
    async insertNotification(n) {
      const notification = {...n, id: db.nextNotificationId++, createdAt: new Date().toISOString(), read: false};
      db.notifications.unshift(notification);
      db.notifications = db.notifications.slice(0, 500);
      save();
      return notification;
    },
    async lastNotification(room, kind, since) {
      return db.notifications.find(n => n.room === room && n.kind === kind && new Date(n.createdAt) >= since) || null;
    },
    async markNotificationsRead(id) {
      db.notifications.forEach(n => { if (!id || n.id === id) n.read = true; });
      save();
    },
  };
}
