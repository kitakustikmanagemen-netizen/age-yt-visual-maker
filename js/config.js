// ============================================================
// AGE YT# Visual Maker — config.js
// Konfigurasi 5 fitur, model default, dan Worker proxy bersama
// ============================================================

// Worker proxy bersama AGE YT# (v3 — mendukung mode teks & gambar,
// backward-compatible dengan Tools #1 & #2)
const DEFAULT_WORKER_URL = "https://age-yt-proxy.kitakustik-managemen.workers.dev/";

// Model default per mode.
// PENTING: Imagen API resmi dihentikan Google 17 Agustus 2026.
// gemini-2.5-flash-image ("Nano Banana") dipakai sebagai gantinya —
// satu-satunya model gambar Gemini yang masih ada free tier (~500/hari).
const DEFAULT_TEXT_MODEL = "gemini-3.5-flash";
const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";

// localStorage keys (konsisten dengan Tools #1 & #2)
const LS_KEYS = "ageyt_api_keys";
const LS_WORKER = "ageyt_worker_url";

// Opsi rasio gambar yang dipakai di beberapa fitur.
// Nano Banana tidak punya parameter aspect-ratio terpisah —
// rasio disisipkan sebagai instruksi eksplisit di dalam prompt.
const ASPECT_RATIOS = [
  { id: "16:9", label: "16:9 — Landscape (YouTube, Thumbnail)" },
  { id: "9:16", label: "9:16 — Portrait (Shorts, Reels, TikTok, Story)" },
  { id: "1:1",  label: "1:1 — Square (Feed IG/FB)" },
  { id: "4:5",  label: "4:5 — Portrait Feed (IG/FB Carousel)" },
];

// Target penonton — versi ringkas, dipakai fitur teks (prompt generator, b-roll)
const AUDIENCES = [
  { id: "umum",    label: "🇮🇩 Umum" },
  { id: "muda",    label: "🇮🇩 Anak Muda" },
  { id: "tua",     label: "🇮🇩 Orang Tua" },
  { id: "global",  label: "🌍 Global (English)" },
];

const PLATFORMS = ["TikTok", "Instagram", "YouTube", "Facebook"];

// ============================================================
// FEATURES — 5 fitur Tools #3
// type: "image" -> generate gambar via gemini-2.5-flash-image
//       "text"  -> generate teks via model teks (sama seperti Tools #1/#2)
// ============================================================
const FEATURES = [
  {
    id: "thumbnail",
    label: "Thumbnail Generator",
    icon: "🖼️",
    accent: "#ff5c5c",
    type: "image",
    topicLabel: "Topik / isi video",
    topicPlaceholder: "Contoh: review skincare lokal untuk kulit berjerawat",
    showAspectRatio: true,
    defaultAspect: "16:9",
    imageCount: 1,
    extraField: {
      type: "text",
      id: "titleText",
      label: "Teks judul di thumbnail (opsional)",
      placeholder: "Contoh: RAHASIA KULIT GLOWING!",
    },
    buildPrompt: (f, form) => {
      let p = `Buat 1 gambar thumbnail video yang sangat eye-catching dan tajam untuk platform ${form.platform}, `;
      p += `dengan rasio ${form.aspect}, tentang: "${form.topic}". `;
      if (form.titleText) {
        p += `Sertakan teks besar tebal yang mudah dibaca di gambar dengan tulisan: "${form.titleText}" — gunakan font tebal, warna kontras tinggi, ada outline/stroke supaya terbaca jelas di layar kecil HP. `;
      }
      p += `Gaya: warna cerah dan kontras tinggi, ekspresi/elemen visual yang memancing rasa penasaran (curiosity gap), komposisi ala thumbnail YouTube/TikTok yang viral, tidak terlihat seperti stok foto generik. `;
      if (form.detail) p += `Detail tambahan dari user: ${form.detail}. `;
      p += `Hindari watermark, teks blur, atau tangan/wajah yang cacat.`;
      return p;
    },
  },
  {
    id: "carousel",
    label: "Carousel / Slide Maker",
    icon: "🎠",
    accent: "#ffb85c",
    type: "image",
    topicLabel: "Topik carousel",
    topicPlaceholder: "Contoh: 5 tips hemat belanja online",
    showAspectRatio: true,
    defaultAspect: "4:5",
    imageCount: 5,
    extraField: {
      type: "select",
      id: "slideCount",
      label: "Jumlah slide",
      options: ["3", "4", "5", "6", "7", "8"],
      defaultValue: "5",
    },
    buildPrompt: (f, form, slideIndex, slideTotal, slideOutline) => {
      let p = `Buat 1 gambar slide carousel ke-${slideIndex} dari total ${slideTotal} slide, rasio ${form.aspect}, `;
      p += `untuk platform ${form.platform}, topik keseluruhan: "${form.topic}". `;
      p += `Isi khusus slide ini: ${slideOutline}. `;
      p += `Gaya visual harus KONSISTEN di semua slide (palet warna sama, gaya font sama, layout sama) supaya terlihat 1 set carousel yang rapi, `;
      p += `desain flat/clean seperti template Canva estetik, teks besar mudah dibaca, ada sedikit ruang kosong (padding) di tepi. `;
      if (form.detail) p += `Detail tambahan dari user: ${form.detail}. `;
      p += `Hindari watermark dan teks yang terpotong.`;
      return p;
    },
  },
  {
    id: "meme",
    label: "Meme & Quote Card Maker",
    icon: "💬",
    accent: "#5cff9d",
    type: "image",
    topicLabel: "Isi quote / teks meme",
    topicPlaceholder: "Contoh: Rezeki gak akan ketuker, tenang aja",
    showAspectRatio: true,
    defaultAspect: "1:1",
    imageCount: 1,
    extraField: {
      type: "select",
      id: "styleType",
      label: "Gaya kartu",
      options: ["Quote Estetik Minimalis", "Meme Lucu/Relatable", "Motivasi Bold Kontras Tinggi"],
      defaultValue: "Quote Estetik Minimalis",
    },
    buildPrompt: (f, form) => {
      let p = `Buat 1 gambar ${form.styleType.toLowerCase()} dengan rasio ${form.aspect} untuk platform ${form.platform}. `;
      p += `Teks utama yang WAJIB tampil jelas dan terbaca di gambar: "${form.topic}". `;
      p += `Pastikan tidak ada typo, ejaan teks harus persis sama seperti yang diminta. `;
      if (form.detail) p += `Detail gaya tambahan dari user: ${form.detail}. `;
      p += `Komposisi rapi, kontras teks vs background tinggi supaya gampang dibaca di feed, tidak ada watermark.`;
      return p;
    },
  },
  {
    id: "prompt-generator",
    label: "Image Prompt Generator",
    icon: "✍️",
    accent: "#5cc9ff",
    type: "text",
    maxTokens: 2048,
    topicLabel: "Deskripsi singkat gambar yang diinginkan",
    topicPlaceholder: "Contoh: foto produk skincare di atas meja marmer, nuansa mewah",
    showAspectRatio: false,
    extraField: {
      type: "select",
      id: "targetTool",
      label: "Prompt untuk dipakai di",
      options: ["Nano Banana / Gemini", "Midjourney", "DALL-E", "Umum (semua AI image)"],
      defaultValue: "Nano Banana / Gemini",
    },
    buildPrompt: (f, form) => {
      let p = `Buatkan 3 variasi prompt gambar dalam Bahasa Inggris yang detail dan siap pakai untuk tool "${form.targetTool}", `;
      p += `berdasarkan deskripsi ini: "${form.topic}". Platform tujuan konten: ${form.platform}. `;
      p += `Setiap prompt harus mencakup: subjek utama, komposisi/framing, pencahayaan, gaya visual/artistik, warna dominan, dan mood. `;
      p += `Format output: 3 prompt bernomor (1. 2. 3.), tiap prompt 1 paragraf dalam Bahasa Inggris, lalu di bawah tiap prompt beri 1 baris terjemahan singkat Bahasa Indonesia dalam tanda kurung. `;
      if (form.detail) p += `Detail tambahan dari user: ${form.detail}. `;
      p += `Jangan ada kalimat pembuka atau penutup basa-basi, langsung ke daftar prompt.`;
      return p;
    },
  },
  {
    id: "broll-keywords",
    label: "B-roll Keyword Suggester",
    icon: "🎬",
    accent: "#c95cff",
    type: "text",
    maxTokens: 2048,
    topicLabel: "Topik / isi video",
    topicPlaceholder: "Contoh: video tips produktivitas kerja dari rumah",
    showAspectRatio: false,
    extraField: null,
    buildPrompt: (f, form) => {
      let p = `Buatkan daftar 15 keyword pencarian footage/foto stok (dalam Bahasa Inggris, siap ditempel ke Pexels/Pixabay/Envato) `;
      p += `untuk video dengan topik: "${form.topic}", platform ${form.platform}. `;
      p += `Kelompokkan jadi 3 kategori dengan judul: "Opening/Hook", "Isi Utama", "Penutup/CTA", masing-masing 5 keyword. `;
      p += `Tiap keyword singkat (2-5 kata), spesifik dan visual (bukan konsep abstrak). `;
      if (form.detail) p += `Detail tambahan dari user: ${form.detail}. `;
      p += `Jangan ada kalimat pembuka/penutup basa-basi, langsung ke daftar.`;
      return p;
    },
  },
];

function getFeatureById(id) {
  return FEATURES.find((f) => f.id === id) || FEATURES[0];
}
