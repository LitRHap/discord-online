import { createRequire } from 'node:module';
import { logger } from './logger.js';
import { loadToken, saveToken, clearToken } from './tokenStore.js';
import { PresenceManager } from './presence.js';

const require = createRequire(import.meta.url);
const { Client } = require('discord.js-selfbot-v13');

export class OnlineKeeper {
  constructor(config) {
    this.config = config;
    this.client = new Client({ checkUpdate: false });
    this.startedAt = null;
    this.presence = new PresenceManager(this.client, config);
    this.bindEvents();
  }

  get status() {
    return {
      ready: this.client.isReady(),
      user: this.client.user?.tag ?? null,
      pingMs: this.client.ws.ping,
      uptimeSeconds: this.startedAt ? Math.floor((Date.now() - this.startedAt) / 1000) : 0
    };
  }

  bindEvents() {
    const c = this.client;

    c.on('ready', async () => {
      this.startedAt = Date.now();
      logger.info(`Online sebagai ${c.user.tag}`);
      await this.presence.start();
      // simpan token agar login berikutnya tidak memakai password lagi
      if (c.token) await saveToken(this.config.tokenFile, c.token);
    });

    // Token ditolak/dicabut (ganti password, logout semua perangkat, dll)
    c.on('invalidated', async () => {
      logger.error('Sesi tidak valid. Token dihapus, proses keluar agar pm2 login ulang');
      await clearToken(this.config.tokenFile);
      process.exit(1);
    });

    c.on('shardDisconnect', (e, id) => logger.warn(`Terputus dari gateway (shard ${id}, kode ${e?.code})`));
    c.on('shardReconnecting', () => logger.info('Menyambung ulang ke gateway...'));
    c.on('shardResume', () => {
      logger.info('Tersambung kembali');
      this.presence.apply();
    });
    c.on('error', (err) => logger.error(`Client error: ${err.message}`));
  }

  async start() {
    const { token, login, password, mfaCode, tokenFile } = this.config;

    // 1) token dari .env  2) token tersimpan dari login sebelumnya  3) email + password
    const stored = token || (await loadToken(tokenFile));
    if (stored) {
      logger.info('Login memakai token tersimpan');
      try {
        return await this.client.login(stored);
      } catch (err) {
        logger.warn(`Token gagal (${err.message}), coba login password`);
        await clearToken(tokenFile);
      }
    }

    if (!login || !password) {
      throw new Error('Isi DISCORD_LOGIN dan DISCORD_PASSWORD di .env (atau DISCORD_TOKEN)');
    }

    logger.info('Login memakai email/nomor HP + password');
    try {
      if (typeof this.client.normalLogin === 'function') {
        await this.client.normalLogin(login, password, mfaCode || undefined);
      } else if (typeof this.client.passLogin === 'function') {
        await this.client.passLogin(login, password);
      } else {
        throw new Error('Versi library tidak mendukung login password');
      }
    } catch (err) {
      logger.error(`Login password gagal: ${err.message}`);
      if (/captcha/i.test(err.message)) {
        logger.error('Discord meminta captcha. Login dari IP VPS sering diminta captcha: coba login dulu dari HP/PC di jaringan yang sama, atau pakai DISCORD_TOKEN.');
      }
      throw err;
    }
  }

  async stop() {
    logger.info('Menghentikan...');
    this.presence.stop();
    this.client.destroy();
  }
}
