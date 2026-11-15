import { createRequire } from 'node:module';
import { logger } from './logger.js';

const require = createRequire(import.meta.url);
const { RichPresence, CustomStatus } = require('discord.js-selfbot-v13');

const isDiscordCdn = (u) => /^https?:\/\/(cdn\.discordapp\.com|media\.discordapp\.net)\//.test(u);

export class PresenceManager {
  constructor(client, config) {
    this.client = client;
    this.config = config;
    this.index = 0;
    this.timer = null;
    this.assetCache = new Map(); // url -> external_asset_path
    this.startTime = Date.now();
  }

  // Ubah link gambar biasa menjadi aset eksternal yang diterima Discord
  async resolveImages(urls) {
    const need = [...new Set(urls.filter((u) => u && !isDiscordCdn(u) && !this.assetCache.has(u)))];
    for (let i = 0; i < need.length; i += 2) {
      const chunk = need.slice(i, i + 2); // API maksimal 2 gambar per panggilan
      try {
        const res = await RichPresence.getExternal(this.client, this.config.applicationId, ...chunk);
        res.forEach((r, n) => this.assetCache.set(chunk[n], r.external_asset_path));
      } catch (err) {
        logger.warn(`Gagal memproses gambar (${chunk.join(', ')}): ${err.message}`);
      }
    }
  }

  image(url) {
    if (!url) return null;
    return isDiscordCdn(url) ? url : this.assetCache.get(url) || null;
  }

  async build(p) {
    const type = (p.type || 'PLAYING').toUpperCase();
    const activities = [];

    if (type !== 'CUSTOM') {
      await this.resolveImages([p.largeImage, p.smallImage]);

      const rpc = new RichPresence(this.client)
        .setApplicationId(this.config.applicationId)
        .setType(type)
        .setName(p.name || 'Discord');

      if (p.details) rpc.setDetails(p.details);
      if (p.state) rpc.setState(p.state);
      if (type === 'STREAMING' && p.url) rpc.setURL(p.url);
      if (p.elapsed) rpc.setStartTimestamp(this.startTime);

      const large = this.image(p.largeImage);
      const small = this.image(p.smallImage);
      if (large) rpc.setAssetsLargeImage(large);
      if (small) rpc.setAssetsSmallImage(small);
      if (p.largeText) rpc.setAssetsLargeText(p.largeText);
      if (p.smallText) rpc.setAssetsSmallText(p.smallText);

      for (const b of p.buttons || []) rpc.addButton(b.label, b.url);
      activities.push(rpc);
    }

    const cs = p.customStatus;
    if (cs && (cs.text || cs.emoji)) {
      const custom = new CustomStatus(this.client);
      if (cs.emoji) custom.setEmoji(cs.emoji);
      if (cs.text) custom.setState(cs.text);
      activities.push(custom);
    }
    return activities;
  }

  async apply() {
    const p = this.config.presences[this.index];
    try {
      const activities = await this.build(p);
      this.client.user.setPresence({ status: this.config.status, activities });
      logger.info(`Presence #${this.index + 1}/${this.config.presences.length}: ${(p.type || 'PLAYING').toUpperCase()} ${p.name || ''}`.trim());
    } catch (err) {
      logger.error(`Gagal menerapkan presence #${this.index + 1}: ${err.message}`);
      this.client.user.setStatus(this.config.status);
    }
  }

  async start() {
    this.stop();
    await this.apply();
    if (this.config.presences.length > 1) {
      this.timer = setInterval(() => {
        this.index = (this.index + 1) % this.config.presences.length;
        this.apply();
      }, this.config.rotateSeconds * 1000);
      logger.info(`Rotasi aktif tiap ${this.config.rotateSeconds} detik`);
    }
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
