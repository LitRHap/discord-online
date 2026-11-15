import 'dotenv/config';
import fs from 'node:fs';

const get = (k) => process.env[k]?.trim() || '';
const bool = (k) => ['1', 'true', 'yes', 'on'].includes(get(k).toLowerCase());

const TYPES = ['PLAYING', 'STREAMING', 'LISTENING', 'WATCHING', 'COMPETING', 'CUSTOM'];
const DEFAULT_APP_ID = '367827983903490050'; // dipakai hanya untuk meng-host gambar eksternal

// Satu presence dari .env
function presenceFromEnv() {
  const buttons = [1, 2]
    .map((i) => ({ label: get(`BUTTON${i}_LABEL`), url: get(`BUTTON${i}_URL`) }))
    .filter((b) => b.label && b.url);

  const text = get('CUSTOM_STATUS_TEXT');
  const emoji = get('CUSTOM_STATUS_EMOJI');

  return {
    type: (get('PRESENCE_TYPE') || (get('PRESENCE_NAME') ? 'PLAYING' : '')).toUpperCase(),
    name: get('PRESENCE_NAME'),
    details: get('PRESENCE_DETAILS'),
    state: get('PRESENCE_STATE'),
    url: get('STREAM_URL'),
    largeImage: get('LARGE_IMAGE'),
    largeText: get('LARGE_TEXT'),
    smallImage: get('SMALL_IMAGE'),
    smallText: get('SMALL_TEXT'),
    buttons,
    elapsed: bool('SHOW_ELAPSED'),
    customStatus: text || emoji ? { text, emoji } : null
  };
}

// Banyak presence (rotasi) dari presence.json, jika filenya ada
function loadPresences() {
  const file = get('PRESENCE_FILE') || 'presence.json';
  if (fs.existsSync(file)) {
    const list = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(list) || !list.length) throw new Error(`${file} harus berupa array berisi minimal 1 presence`);
    return { list, source: file };
  }
  return { list: [presenceFromEnv()], source: '.env' };
}

const { list, source } = loadPresences();

for (const [i, p] of list.entries()) {
  const t = (p.type || '').toUpperCase();
  if (t && !TYPES.includes(t)) throw new Error(`presence #${i + 1}: type "${p.type}" tidak valid (${TYPES.join(', ')})`);
  if (t === 'STREAMING' && !p.url) throw new Error(`presence #${i + 1}: STREAMING wajib punya url Twitch/YouTube`);
  if ((p.buttons || []).length > 2) throw new Error(`presence #${i + 1}: maksimal 2 tombol`);
}

export const config = {
  login: get('DISCORD_LOGIN'),
  password: get('DISCORD_PASSWORD'),
  token: get('DISCORD_TOKEN'),
  status: ['online', 'idle', 'dnd', 'invisible'].includes(get('STATUS')) ? get('STATUS') : 'online',
  applicationId: /^[0-9]{17,19}$/.test(get('APPLICATION_ID')) ? get('APPLICATION_ID') : DEFAULT_APP_ID,
  rotateSeconds: Math.max(15, parseInt(get('ROTATE_SECONDS') || '30', 10) || 30),
  presences: list,
  presenceSource: source,
  port: get('PORT') ? parseInt(get('PORT'), 10) : null,
  tokenFile: 'data/token.json'
};
