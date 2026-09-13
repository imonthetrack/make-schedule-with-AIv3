export interface ScheduleItem {
  id: string;
  time: string; // HH:mm format
  title: string;
  category?: 'study' | 'music' | 'break' | 'work' | 'personal';
  completed: boolean;
  completedAt?: string;
  durationMinutes?: number;
  microStep?: string; // AI Micro-Step generated physical first step
  motivationAudioTone?: 'energetic' | 'fanfare' | 'gentle' | 'voice';
  hobbyAudioType?: 'custom_mp3' | 'energetic_beat' | 'acoustic_melody' | 'lofi_wake';
  hobbyAudioName?: string; // e.g. "Semangat_Gitar.mp3"
  hobbyAudioBlobKey?: string; // Key in IndexedDB for custom uploaded MP3
}

export interface StudyTechnique {
  id: 'pomodoro' | 'feynman' | 'osn_sprint';
  title: string;
  tagline: string;
  badge: string;
  icon: string;
  description: string;
  howItWorks: string[];
  bestFor: string;
  workMinutes: number;
  breakMinutes: number;
  rounds: number;
}

export interface PresetTemplate {
  id: 'sekolah' | 'weekend' | 'hobby' | 'fokus_cepat';
  name: string;
  icon: string;
  description: string;
  categoryType: 'schedule' | 'tool';
  items: Omit<ScheduleItem, 'id' | 'completed' | 'completedAt'>[];
}

export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string | null; // YYYY-MM-DD
  history: Record<string, boolean>; // YYYY-MM-DD -> completed min target
}

export interface RestTimerState {
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  isAlarmTriggered: boolean;
}

export interface AiMicroStepResponse {
  microStep: string;
}

export interface AiDynamicEvaluatorResponse {
  response: string;
  suggestedShiftMinutes?: number;
}

