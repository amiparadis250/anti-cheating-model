// Loads the Edge Impulse WebAssembly classifier (public/model) and runs it on camera frames.
// Model: image classification, 96x96 RGB, labels: not_suspicious / suspicious.
const BASE = `${import.meta.env.BASE_URL}model/`;
export const THRESHOLD = Number(import.meta.env.VITE_MODEL_THRESHOLD) || 0.6;
const RESIZE = import.meta.env.VITE_MODEL_RESIZE || 'squash'; // 'squash' | 'fit-shortest' - must match Studio's impulse image block

let classifier = null, loading = null, size = {w: 96, h: 96};
const loadScript = src => new Promise((resolve, reject) => {
  const s = document.createElement('script');
  s.src = src; s.onload = resolve; s.onerror = () => reject(new Error(`Failed to load ${src}`));
  document.head.appendChild(s);
});

export function loadBehaviorModel() {
  if (classifier) return Promise.resolve(classifier);
  if (!loading) loading = (async () => {
    await loadScript(`${BASE}edge-impulse-standalone.js`); // defines window.Module, finds the .wasm beside itself
    await loadScript(`${BASE}run-impulse.js`);
    const c = new window.EdgeImpulseClassifier();
    await c.init();
    const p = c.getProperties();
    size = {w: p.input_width, h: p.input_height};
    classifier = c;
    return c;
  })().catch(err => { loading = null; throw err; });
  return loading;
}

const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;

// Draw a video frame into the model's input size and pack pixels as 0xRRGGBB floats (Edge Impulse image format).
export function frameToFeatures(video) {
  const {w, h} = size;
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  const vw = video.videoWidth, vh = video.videoHeight;
  if (RESIZE === 'fit-shortest') {
    const side = Math.min(vw, vh);
    ctx.drawImage(video, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, w, h);
  } else ctx.drawImage(video, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data, out = new Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = (px[i * 4] << 16) | (px[i * 4 + 1] << 8) | px[i * 4 + 2];
  return out;
}

// Returns {label, suspicious (0-1), scores}
export function classifyFrame(video) {
  const res = classifier.classify(frameToFeatures(video));
  const scores = Object.fromEntries(res.results.map(r => [r.label, r.value]));
  return {suspicious: scores.suspicious ?? 0, scores};
}
