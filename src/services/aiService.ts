import { AiMicroStepResponse, AiDynamicEvaluatorResponse } from '../types';

/**
 * AI Service for "Rest Guard"
 * Interfaces with the backend Express server running Gemini 3.8 Flash.
 */

// 1. FUNGSI 1: AI MICRO-STEP NOTIFIER (Penyederhana Tugas)
export async function fetchAiMicroStep(taskTitle: string): Promise<string> {
  try {
    const res = await fetch('/api/ai/micro-step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskTitle }),
    });

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }

    const data: AiMicroStepResponse = await res.json();
    return data.microStep;
  } catch (error) {
    console.warn('Failed to fetch AI micro-step, using local heuristic:', error);
    return `Coba siapkan dulu peralatan untuk "${taskTitle}", nggak usah dipikirin selesainya dulu.`;
  }
}

// 2. FUNGSI 2: AI DYNAMIC EVALUATOR (Teman Akuntabilitas)
export async function fetchAiDynamicEvaluator(
  reason: string,
  taskTitle?: string
): Promise<AiDynamicEvaluatorResponse> {
  try {
    const res = await fetch('/api/ai/dynamic-evaluator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, taskTitle }),
    });

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }

    const data: AiDynamicEvaluatorResponse = await res.json();
    return {
      response: data.response,
      suggestedShiftMinutes: data.suggestedShiftMinutes || 15,
    };
  } catch (error) {
    console.warn('Failed to fetch AI dynamic evaluator, using local fallback:', error);
    return {
      response: 'Wajar banget kok kalau merasa capek atau buntu sekarang. Istirahat sejenak dulu yuk, kita geser jadwalnya 15 menit ke depan ya.',
      suggestedShiftMinutes: 15,
    };
  }
}

// 3. UNIFIED ASSISTANT (Auto-detect / Direct Mode)
export async function fetchAiAssistant(
  input: string,
  mode: 'micro_step' | 'dynamic_evaluator' | 'auto' = 'auto'
): Promise<{ output: string; suggestedShiftMinutes: number }> {
  try {
    const res = await fetch('/api/ai/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, mode }),
    });

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }

    const data = await res.json();
    return {
      output: data.output,
      suggestedShiftMinutes: data.suggestedShiftMinutes || 15,
    };
  } catch (error) {
    console.warn('Failed to fetch AI assistant:', error);
    return {
      output: 'Ambil napas dalam-dalam dulu. Kita mulai lagi pelan-pelan dari langkah termudah ya.',
      suggestedShiftMinutes: 15,
    };
  }
}
