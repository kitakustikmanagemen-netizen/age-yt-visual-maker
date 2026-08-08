# AGE YT# Visual Maker (Tools #3)

Tools ke-3 dari proyek AGE YT#: bikin **Thumbnail**, **Carousel/Slide**,
**Meme & Quote Card** pakai AI image generation, plus **Image Prompt
Generator** dan **B-roll Keyword Suggester** (teks saja).

## ⚠️ Catatan penting sebelum deploy

Imagen API dari Google **resmi dihentikan 17 Agustus 2026**. Tools ini
sudah dibangun pakai model penggantinya, **`gemini-2.5-flash-image`**
("Nano Banana") — masih ada free tier (~500 request/hari) lewat Gemini
API key gratis yang sama dipakai Tools #1 & #2.

## Yang WAJIB dilakukan sebelum tools ini bisa jalan

Worker proxy bersama (`age-yt-proxy.kitakustik-managemen.workers.dev`)
**HARUS di-upgrade ke versi baru** (`worker/worker.js` di folder ini)
supaya bisa memproses mode gambar. Worker versi lama (v2) yang dipakai
Tools #1 & #2 **tetap berfungsi normal** untuk request teks — file baru
ini backward-compatible, tidak akan merusak Tools #1/#2 yang sudah live.

Langkah upgrade Worker:
1. dash.cloudflare.com → Workers & Pages → buka Worker `age-yt-proxy`
2. Edit code → **hapus semua isi lama**, ganti dengan isi file
   `worker/worker.js` di folder ini
3. Klik **Deploy** (bukan cuma save)
4. Tes: buka URL worker di browser (GET) → harus tetap muncul
   `{"error":"Method not allowed. Gunakan POST."}` seperti biasa

Setelah Worker ter-upgrade, Tools #1 dan #2 yang sudah live **tidak perlu
diubah sama sekali** — mereka otomatis tetap jalan normal karena tidak
mengirim field `mode` (default-nya tetap mode teks).

## Deploy frontend (sama seperti Tools #1 & #2)

1. Upload semua file di folder ini (index.html + folder css/js/worker)
   ke repo GitHub baru — pastikan `index.html` ada di ROOT repo
2. Cloudflare dashboard → Workers & Pages → Create → tab **Pages** →
   Connect to Git → pilih repo
3. Build settings: Framework preset = **None**, Build command = kosong,
   Build output directory = **/**
4. Save and Deploy → tunggu 1-2 menit → dapat URL `*.pages.dev`
5. (Opsional) Custom domain lewat tab **Custom domains**

## Struktur file

```
age-yt-visual-maker/
├── index.html
├── css/
│   └── style.css        ← tema Mixer Panel, konsisten Tools #1 & #2
├── js/
│   ├── config.js         ← 5 fitur + prompt builder
│   └── app.js             ← logic UI, generate gambar/teks, multi API key
├── worker/
│   └── worker.js           ← WAJIB dipakai untuk upgrade Worker bersama (lihat di atas)
└── README.md
```

## 5 fitur di dalamnya

| Fitur | Tipe | Catatan |
|---|---|---|
| Thumbnail Generator | Gambar | 1 gambar, ada opsi teks judul overlay |
| Carousel / Slide Maker | Gambar | 3-8 slide, outline tiap slide dibuat otomatis dulu via teks supaya tidak mengulang isi |
| Meme & Quote Card Maker | Gambar | Fokus keterbacaan teks di gambar |
| Image Prompt Generator | Teks | 3 variasi prompt siap pakai (Nano Banana/Midjourney/DALL-E) |
| B-roll Keyword Suggester | Teks | 15 keyword pencarian stok footage, dikelompokkan 3 bagian |

Semua fitur gambar punya pilihan rasio (16:9, 9:16, 1:1, 4:5) yang
disisipkan sebagai instruksi ke dalam prompt (Nano Banana tidak punya
parameter aspect-ratio terpisah seperti Imagen).

## Kalau ada masalah

- **Gambar gagal generate / error dari model** — coba ubah deskripsi,
  kadang model menolak permintaan tertentu (misal ada tokoh publik/brand
  bermerek). Pesan error dari model akan ditampilkan di panel hasil.
- **Error 429/401/403** — sistem otomatis coba API key berikutnya kalau
  user punya lebih dari 1 key tersimpan.
- **Model gambar sudah tidak berlaku lagi** — cek dulu
  `DEFAULT_IMAGE_MODEL` di `js/config.js` dan fallback model di
  `worker/worker.js`, kemungkinan besar Google sudah ganti nama model lagi
  (lihat pola yang sama di Bagian 4 brief master proyek).
