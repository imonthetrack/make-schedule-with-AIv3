import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini Client
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

const SYSTEM_INSTRUCTION = `Kamu adalah mesin AI utama untuk aplikasi produktivitas "Rest Guard".
Tugasmu berfokus pada 2 fungsi utama:

==================================================
FUNGSI 1: AI MICRO-STEP NOTIFIER (Penyederhana Tugas)
==================================================
Tugas:
Mengubah tugas atau aktivitas berat yang diinput pengguna menjadi "Micro-Steps" (langkah mikroskopis) yang sangat ringan dan mudah dilakukan untuk memotong rasa malas.

Aturan Output:
1. Kalimat ajakan harus sangat pendek (maksimal 1-2 kalimat).
2. Fokus HANYA pada aksi fisik pertama yang paling ringan (contoh: "buka buku", "berdiri dari kasur", "ambil instrumen", "buka laptop").
3. Gunakan nada bicara santai, bersahabat, dan tanpa tekanan.
4. JANGAN pernah menyuruh menyelesaikan seluruh tugas sekaligus.

Contoh Interaksi:
- Input: "Kerjakan 10 Soal Matematika OSN"
  Output: "Coba buka dulu buku MTK-mu, baca soal nomor 1 aja dulu."
- Input: "Latihan Biola Tangga Nada"
  Output: "Ambil hardcase biolamu, buka kuncinya. Nggak usah dimainin dulu, yang penting siapin instrumennya."

==================================================
FUNGSI 2: AI DYNAMIC EVALUATOR (Teman Akuntabilitas)
==================================================
Tugas:
Merespon alasan pengguna ketika gagal, menunda, atau menolak menyelesaikan tugas yang sudah dijadwalkan.

Aturan Output:
1. Berikan respon berupa empati dan dorongan positif (tanpa menghakimi atau membuat pengguna merasa bersalah).
2. Berikan saran penyusunan ulang jadwal (reschedule) yang realistis agar tidak memicu burnout (misalnya geser 15, 30, 45, atau 60 menit).
3. Jawab dalam 2-3 kalimat yang menenangkan sekaligus memberi solusi konkret.

Contoh Interaksi:
- Input: "Saya malas banget, kepalanya pusing habis sekolah."
  Output: "Wajar banget kok kalau capek, istirahat dulu aja sekarang. Jadwal ini kita geser 45 menit ke depan ya, biar pikiranmu segar lagi."
- Input: "Soal fisika ini terlalu susah, saya mau menyerah aja."
  Output: "Nggak apa-apa, materi ini memang butuh waktu. Coba stop dulu 15 menit, nanti kita coba lagi dari soal yang paling gampang ya."

==================================================
FORMAT RESPONS SANGAT PENTING:
- Kenali jenis input dari aplikasi (apakah berupa NAMA TUGAS atau ALASAN KEGAGALAN).
- Berikan respon yang langsung to-the-point sesuai fungsi yang dipanggil tanpa pembuka formal.`;

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 1. FUNGSI 1: AI MICRO-STEP NOTIFIER Endpoint
app.post('/api/ai/micro-step', async (req, res) => {
  try {
    const { taskTitle } = req.body;
    if (!taskTitle || typeof taskTitle !== 'string') {
      res.status(400).json({ error: 'taskTitle is required' });
      return;
    }

    const ai = getAi();
    const prompt = `[FUNGSI 1: AI MICRO-STEP NOTIFIER]\nTugas Pengguna: "${taskTitle}"\nUbah tugas ini menjadi 1 aksi fisik mikroskopis pertama yang sangat ringan (maksimal 1-2 kalimat). Langsung berikan kalimat ajakannya tanpa basa-basi:`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    const outputText = response.text?.trim() || `Coba mulai dari langkah paling kecil: siapkan dulu perlengkapanmu sekarang ya.`;
    res.json({ microStep: outputText });
  } catch (error: any) {
    console.error('Error generating micro-step:', error);
    // Graceful fallback if API key not yet set or transient error
    res.json({
      microStep: `Buka dulu peralatan untuk kegiatan ini, siapkan di meja tanpa tekanan apapun.`,
    });
  }
});

// 2. FUNGSI 2: AI DYNAMIC EVALUATOR Endpoint
app.post('/api/ai/dynamic-evaluator', async (req, res) => {
  try {
    const { reason, taskTitle } = req.body;
    if (!reason || typeof reason !== 'string') {
      res.status(400).json({ error: 'reason is required' });
      return;
    }

    const ai = getAi();
    const taskContext = taskTitle ? ` (Terkait tugas: "${taskTitle}")` : '';
    const prompt = `[FUNGSI 2: AI DYNAMIC EVALUATOR]\nAlasan/Keluhan Pengguna${taskContext}: "${reason}"\nBerikan respon empati, dorongan tanpa rasa bersalah, dan saran geser waktu (reschedule) yang realistis dalam 2-3 kalimat:`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    const outputText = response.text?.trim() || `Wajar banget kok merasa lelah atau buntu. Istirahat dulu sejenak 15-30 menit ya, nanti kita lanjutkan lagi pelan-pelan.`;

    // Extract suggested minutes if mentioned in the response (e.g. 15, 30, 45, 60 menit)
    let suggestedShiftMinutes = 15;
    const match = outputText.match(/(\d+)\s*(?:menit|mnt)/i);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (parsed > 0 && parsed <= 180) {
        suggestedShiftMinutes = parsed;
      }
    }

    res.json({
      response: outputText,
      suggestedShiftMinutes,
    });
  } catch (error: any) {
    console.error('Error in dynamic evaluator:', error);
    res.json({
      response: `Wajar banget kalau kamu butuh jeda sekarang. Yuk kita geser jadwalnya 15 menit ke depan biar pikiranmu lebih santai.`,
      suggestedShiftMinutes: 15,
    });
  }
});

// 3. UNIFIED ASSISTANT: Auto-Detect Function or Manual Mode
app.post('/api/ai/assistant', async (req, res) => {
  try {
    const { input, mode } = req.body;
    if (!input || typeof input !== 'string') {
      res.status(400).json({ error: 'input is required' });
      return;
    }

    const ai = getAi();
    let prompt = '';
    if (mode === 'micro_step') {
      prompt = `[FUNGSI 1: AI MICRO-STEP NOTIFIER]\nTugas: "${input}"\nBerikan 1-2 kalimat aksi fisik pertama yang paling ringan:`;
    } else if (mode === 'dynamic_evaluator') {
      prompt = `[FUNGSI 2: AI DYNAMIC EVALUATOR]\nAlasan kegagalan/penundaan: "${input}"\nBerikan respon empati + solusi reschedule dalam 2-3 kalimat:`;
    } else {
      prompt = `Kenali apakah input berikut berupa NAMA TUGAS (jalankan FUNGSI 1: AI Micro-Step Notifier) atau ALASAN KEGAGALAN/PENUNDAAN (jalankan FUNGSI 2: AI Dynamic Evaluator).\nInput: "${input}"\nBerikan respon langsung sesuai fungsi tersebut:`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    const outputText = response.text?.trim() || '';
    let suggestedShiftMinutes = 15;
    const match = outputText.match(/(\d+)\s*(?:menit|mnt)/i);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (parsed > 0 && parsed <= 180) suggestedShiftMinutes = parsed;
    }

    res.json({
      output: outputText,
      suggestedShiftMinutes,
    });
  } catch (error: any) {
    console.error('Error in AI assistant:', error);
    res.json({
      output: `Istirahat dulu sejenak ya. Coba mulai dari langkah paling santai saat kamu siap.`,
      suggestedShiftMinutes: 15,
    });
  }
});

// Setup Vite middleware for development or Static Serving for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Rest Guard Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
