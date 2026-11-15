import fs from 'node:fs/promises';
import path from 'node:path';

export async function loadToken(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')).token || null;
  } catch {
    return null;
  }
}

export async function saveToken(file, token) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify({ token }), { mode: 0o600 });
}

export async function clearToken(file) {
  await fs.rm(file, { force: true });
}
