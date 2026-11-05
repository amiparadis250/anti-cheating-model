import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import os from 'node:os';
const cands = Object.entries(os.networkInterfaces()).flatMap(([name, list]) =>
  (list || []).filter(i => i.family === 'IPv4' && !i.internal && !/^169\.254\./.test(i.address)).map(i => ({name, ip: i.address})));
const bad = c => /tailscale|vpn|vethernet|virtual|vmware|wsl|docker|bluetooth/i.test(c.name) || /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(c.ip);
const lanIp = (cands.find(c => /wi-?fi|wlan|wireless/i.test(c.name) && !bad(c)) || cands.find(c => !bad(c)) || {}).ip || '';
export default defineConfig({
  plugins: [react(), tailwindcss(), basicSsl()],
  server: {port: 5173, proxy: {'/api': 'http://localhost:8000'}},
  define: {__LAN_ORIGIN__: JSON.stringify(lanIp ? `https://${lanIp}:5173` : '')},
});
