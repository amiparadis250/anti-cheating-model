export const BEHAVIOR = 'Behavior detection';
export const SOUND = 'Sound detection';
export const DEFAULT_RULES = {suspiciousLimit: 8, cueLimit: 5, windowMinutes: 10};

export function decide(behavior, cue, rules = DEFAULT_RULES) {
  const behaviorHigh = behavior > rules.suspiciousLimit;
  const cueHigh = cue > rules.cueLimit;
  if (behaviorHigh && cueHigh) return {level: 'critical', kind: 'combined'};
  if (behaviorHigh) return {level: 'warning', kind: 'behavior'};
  if (cueHigh) return {level: 'warning', kind: 'sound'};
  return null;
}

export const alertTimestamp = a => a.createdAt ? new Date(a.createdAt).getTime() : new Date(`${a.date}T${a.time}`).getTime();

export function roomRisk(alerts, roomName, rules = DEFAULT_RULES, now = Date.now()) {
  const since = now - rules.windowMinutes * 60000;
  let behavior = 0, cue = 0;
  for (const a of alerts) {
    if (a.room !== roomName) continue;
    const at = alertTimestamp(a);
    if (!Number.isFinite(at) || at < since) continue;
    if (a.model === BEHAVIOR) behavior++;
    else if (a.model === SOUND) cue++;
  }
  const decision = decide(behavior, cue, rules);
  return {behavior, cue, level: decision?.level || 'normal', kind: decision?.kind || null};
}

export const LEVEL_RANK = {normal: 0, warning: 1, critical: 2};

export const MODEL_KEYS = {[BEHAVIOR]: 'behavior', 'Phone detection': 'phone', [SOUND]: 'sound'};
