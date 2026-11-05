import {BEHAVIOR, SOUND, DEFAULT_RULES, decide} from '../src/shared/risk.js';

const fromEnv = (name, fallback) => {
  const value = Number(process.env[name]);
  return process.env[name] !== undefined && process.env[name] !== '' && Number.isFinite(value) ? value : fallback;
};

export const RULES = {
  suspiciousLimit: fromEnv('SUSPICIOUS_LIMIT', DEFAULT_RULES.suspiciousLimit),
  cueLimit: fromEnv('CUE_LIMIT', DEFAULT_RULES.cueLimit),
  windowMinutes: fromEnv('ESCALATION_WINDOW_MINUTES', DEFAULT_RULES.windowMinutes),
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function describe(room, decision, behavior, cue, rules) {
  const span = `in the last ${rules.windowMinutes} minutes`;
  if (decision.kind === 'combined') {
    return {
      title: `Critical: suspicious behavior and cheating cues in ${room}`,
      message: `${room} has ${plural(behavior, 'suspicious behavior flag')} (limit ${rules.suspiciousLimit}) and ${plural(cue, 'cheating cue')} (limit ${rules.cueLimit}) ${span}. Immediate supervisor attention is required.`,
    };
  }
  if (decision.kind === 'behavior') {
    return {
      title: `Warning: repeated suspicious behavior in ${room}`,
      message: `${plural(behavior, 'suspicious behavior flag')} ${span} in ${room}, above the limit of ${rules.suspiciousLimit}. Please check the room.`,
    };
  }
  return {
    title: `Warning: repeated cheating cues in ${room}`,
    message: `${plural(cue, 'cheating cue')} ${span} in ${room}, above the limit of ${rules.cueLimit}. Please check the room.`,
  };
}

export async function evaluate(store, alert, rules = RULES, now = new Date()) {
  if (alert.model !== BEHAVIOR && alert.model !== SOUND) return null;
  const since = new Date(now.getTime() - rules.windowMinutes * 60000);
  const [behavior, cue] = await Promise.all([
    store.countAlerts(alert.room, BEHAVIOR, since),
    store.countAlerts(alert.room, SOUND, since),
  ]);
  const decision = decide(behavior, cue, rules);
  if (!decision) return null;
  if (await store.lastNotification(alert.room, decision.kind, since)) return null;
  const {title, message} = describe(alert.room, decision, behavior, cue, rules);
  return store.insertNotification({level: decision.level, kind: decision.kind, room: alert.room, title, message});
}
