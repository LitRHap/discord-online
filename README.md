# discord-247

Menjaga akun Discord tetap online 24/7 dari VPS.

## Cara kerja login
1. Pertama kali: login pakai email/nomor HP + password (`.env`).
2. Setelah berhasil, token otomatis disimpan di `data/token.json`.
3. Start berikutnya memakai token itu, jadi password tidak dipakai berulang (login password berulang dari IP VPS memicu captcha dan meningkatkan risiko akun dibatasi).

## Pakai
```bash
npm install
cp .env.example .env   # isi DISCORD_LOGIN & DISCORD_PASSWORD
npm start              # login pertama, lihat log "Online sebagai ..."
pm2 start index.js --name discord247 && pm2 save
```
Catatan 2FA: library versi 3.7.1 hanya punya `passLogin` (deprecated) tanpa dukungan kode 2FA. Akun dengan 2FA kemungkinan besar gagal login lewat password; pakai `DISCORD_TOKEN` untuk akun seperti itu.

## Presence (Playing / Watching / Streaming / dll)
Dua cara:
1. **Satu presence** lewat `.env` (`PRESENCE_TYPE`, `PRESENCE_NAME`, `PRESENCE_DETAILS`, `LARGE_IMAGE`, dst).
2. **Rotasi banyak presence**: salin `presence.example.json` jadi `presence.json`, edit isinya. Kalau file ini ada, ia dipakai menggantikan `.env`. Ganti tiap `ROTATE_SECONDS` (minimal 15 detik).

Tipe: `PLAYING`, `WATCHING`, `LISTENING`, `COMPETING`, `STREAMING` (wajib `url` Twitch/YouTube), `CUSTOM` (hanya custom status).

### Gambar via link
Isi `LARGE_IMAGE` / `SMALL_IMAGE` dengan **link langsung** (https, berakhiran .png/.jpg/.gif/.webp). Bot mendaftarkannya ke Discord otomatis. Hosting yang cocok:
- **GitHub raw**: taruh gambar di repo public, pakai `https://raw.githubusercontent.com/USER/REPO/main/images/nama.png`. Paling stabil dan permanen.
- **Catbox** (`files.catbox.moe`): upload tanpa akun, link permanen. Mendukung GIF.
- **ImgBB / Postimages**: pakai "Direct link", bukan link halaman.
- **Imgur**: pakai `i.imgur.com/xxx.png`, bukan `imgur.com/xxx`.
- Hindari link `cdn.discordapp.com` hasil upload di chat: sekarang kedaluwarsa dalam hitungan hari.

Tombol maksimal 2. Tombol rich presence umumnya hanya terlihat oleh orang lain, bukan di profilmu sendiri.

## Peringatan
- Memakai akun pengguna lewat script (selfbot) melanggar ToS Discord dan akun bisa dibatasi atau dibanned. Gunakan akun yang siap dikorbankan.
- Library `discord.js-selfbot-v13` sudah diarsipkan (tidak dirawat lagi); versi dipatok ke 3.7.1.
- Jangan commit `.env` dan `data/`.
