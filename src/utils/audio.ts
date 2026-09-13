/**
 * Web Audio API synthesizer for offline alarms and feedback chimes.
 * Initializes AudioContext safely on user interactions with Memory Leak Guards.
 */

let audioCtx: AudioContext | null = null;
let alarmIntervalId: number | null = null;

/**
 * Initializes or resumes the AudioContext on user interaction
 */
export function initAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Memory Leak Guard: Suspend or close audio context when idle / unmounting
 */
export function cleanupAudioContext(): void {
  stopAlarm();
  if (audioCtx && audioCtx.state !== 'closed') {
    try {
      audioCtx.close().catch(() => {});
    } catch (e) {
      console.warn('Error closing AudioContext:', e);
    }
    audioCtx = null;
  }
}

/**
 * Play a fast crisp checkmark chime
 */
export function playCheckSound() {
  try {
    const ctx = initAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12); // G5

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);

    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  } catch (err) {
    console.warn('Audio check error:', err);
  }
}

/**
 * Play a short tactile shift notification beep
 */
export function playShiftSound() {
  try {
    const ctx = initAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now); // A4
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08); // E5

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);

    if (navigator.vibrate) {
      navigator.vibrate(25);
    }
  } catch (err) {
    console.warn('Audio shift error:', err);
  }
}

/**
 * Play test beep tone
 */
export function playBeepTone(freq = 880, duration = 0.2) {
  try {
    const ctx = initAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  } catch (err) {
    console.warn('Beep error:', err);
  }
}

/**
 * Start repeating Rest Guard alarm sound
 */
export function startAlarm() {
  stopAlarm();

  if (navigator.vibrate) {
    navigator.vibrate([200, 100, 200, 100, 400]);
  }

  const triggerBeepCycle = () => {
    try {
      const ctx = initAudioContext();
      const now = ctx.currentTime;

      // Beep 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(987.77, now); // B5
      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Beep 2
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1318.51, now + 0.18); // E6
      gain2.gain.setValueAtTime(0.45, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.35);

      // Beep 3 (High Alert)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sawtooth';
      osc3.frequency.setValueAtTime(1567.98, now + 0.38); // G6
      gain3.gain.setValueAtTime(0.35, now + 0.38);
      gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.38);
      osc3.stop(now + 0.6);

      if (navigator.vibrate) {
        navigator.vibrate([150, 80, 150, 80, 250]);
      }
    } catch (err) {
      console.warn('Alarm error:', err);
    }
  };

  triggerBeepCycle();
  alarmIntervalId = window.setInterval(triggerBeepCycle, 1500);
}

/**
 * Stop running alarm and clear repeating intervals
 */
export function stopAlarm() {
  if (alarmIntervalId !== null) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }
}

/**
 * Play a gentle 2.5s melodious chime for Schedule Alerts (Waktu Kegiatan Dimulai)
 */
export function playScheduleAlertChime() {
  try {
    const ctx = initAudioContext();
    const now = ctx.currentTime;

    const notes = [
      { freq: 523.25, time: 0, dur: 0.8 }, // C5
      { freq: 659.25, time: 0.35, dur: 0.9 }, // E5
      { freq: 783.99, time: 0.7, dur: 1.0 }, // G5
      { freq: 1046.5, time: 1.1, dur: 1.4 }, // C6 (gentle resolution chime)
    ];

    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, now + note.time);

      gain.gain.setValueAtTime(0.001, now + note.time);
      gain.gain.exponentialRampToValueAtTime(0.28, now + note.time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + note.time);
      osc.stop(now + note.time + note.dur);
    });

    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 200]);
    }
  } catch (err) {
    console.warn('Schedule Alert Chime error:', err);
  }
}

/**
 * Speech Synthesis (AI Voice Assistant)
 * Speaks short micro-step prompts or motivational wake-up alerts in Indonesian.
 */
export function speakText(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }

  try {
    window.speechSynthesis.cancel(); // Stop any pending speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID'; // Indonesian
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    // Pick Indonesian voice if available
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find((v) => v.lang.includes('id') || v.lang.includes('ID'));
    if (idVoice) {
      utterance.voice = idVoice;
    }

    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Speech synthesis error:', e);
    if (onEnd) onEnd();
  }
}

/**
 * Play a dedicated motivational wake-up alert chime for the Hobby preset & sessions
 * This is an alert notification to help the user get up and start (not background music).
 */
export function playMotivationalWakeupChime(tone: 'energetic' | 'fanfare' | 'gentle' | 'voice' = 'energetic') {
  try {
    const ctx = initAudioContext();
    const now = ctx.currentTime;

    if (tone === 'voice') {
      // Play a quick chime then speak wake-up motivational cue
      playBeepTone(880, 0.15);
      setTimeout(() => {
        speakText('Waktunya asah skill baru! Ayo berdiri dan siapkan perlengkapanmu sekarang.');
      }, 250);
      return;
    }

    if (tone === 'fanfare') {
      // Victorious Brass Fanfare (Major Triads C5 - E5 - G5 - C6 rapid sequence)
      const fanfareNotes = [
        { f: 523.25, t: 0, d: 0.18, type: 'triangle' as OscillatorType },
        { f: 659.25, t: 0.15, d: 0.18, type: 'triangle' as OscillatorType },
        { f: 783.99, t: 0.3, d: 0.25, type: 'triangle' as OscillatorType },
        { f: 1046.5, t: 0.5, d: 0.7, type: 'sawtooth' as OscillatorType },
      ];

      fanfareNotes.forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = n.type;
        osc.frequency.setValueAtTime(n.f, now + n.t);

        gain.gain.setValueAtTime(0.01, now + n.t);
        gain.gain.exponentialRampToValueAtTime(0.35, now + n.t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + n.t);
        osc.stop(now + n.t + n.d);
      });
      return;
    }

    if (tone === 'gentle') {
      playScheduleAlertChime();
      return;
    }

    // Default 'energetic': High-spirited rhythmic wake-up arpeggio
    const energeticNotes = [
      { freq: 440, t: 0, dur: 0.15 },    // A4
      { freq: 554.37, t: 0.12, dur: 0.15 }, // C#5
      { freq: 659.25, t: 0.24, dur: 0.18 }, // E5
      { freq: 880, t: 0.38, dur: 0.5 },    // A5
      { freq: 1108.73, t: 0.52, dur: 0.6 }, // C#6
    ];

    energeticNotes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, now + note.t);

      gain.gain.setValueAtTime(0.01, now + note.t);
      gain.gain.exponentialRampToValueAtTime(0.3, now + note.t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + note.t);
      osc.stop(now + note.t + note.dur);
    });

    if (navigator.vibrate) {
      navigator.vibrate([120, 60, 120, 60, 300]);
    }
  } catch (err) {
    console.warn('Motivational chime error:', err);
  }
}

/**
 * ============================================================================
 * CONTINUOUS HOBBY ALARM SYSTEM (KHUSUS JADWAL HOBI)
 * Audio terus berputar ketika jadwal hobi dimulai hingga tombol BERHENTI dipencet.
 * ============================================================================
 */

export interface ActiveHobbyAlarmState {
  isPlaying: boolean;
  taskId: string;
  taskTitle: string;
  audioName: string;
}

type HobbyAlarmListener = (state: ActiveHobbyAlarmState) => void;
const hobbyAlarmListeners: Set<HobbyAlarmListener> = new Set();

let currentHobbyAlarmState: ActiveHobbyAlarmState = {
  isPlaying: false,
  taskId: '',
  taskTitle: '',
  audioName: '',
};

let activeHobbyAudioElement: HTMLAudioElement | null = null;
let activeHobbySynthLoopInterval: number | null = null;
let previewAudioElement: HTMLAudioElement | null = null;

function notifyHobbyAlarmListeners() {
  const snapshot = { ...currentHobbyAlarmState };
  hobbyAlarmListeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (e) {
      console.warn('Listener error:', e);
    }
  });
}

export function subscribeHobbyAlarmState(listener: HobbyAlarmListener): () => void {
  hobbyAlarmListeners.add(listener);
  listener({ ...currentHobbyAlarmState });
  return () => {
    hobbyAlarmListeners.delete(listener);
  };
}

export function isContinuousHobbyAlarmActive(): boolean {
  return currentHobbyAlarmState.isPlaying;
}

export function getCurrentHobbyAlarmState(): ActiveHobbyAlarmState {
  return { ...currentHobbyAlarmState };
}

/**
 * Stop continuous hobby alarm completely
 */
export function stopContinuousHobbyAlarm(): void {
  if (activeHobbyAudioElement) {
    try {
      activeHobbyAudioElement.pause();
      activeHobbyAudioElement.currentTime = 0;
      activeHobbyAudioElement.src = '';
    } catch (e) {
      console.warn('Error stopping hobby audio element:', e);
    }
    activeHobbyAudioElement = null;
  }

  if (activeHobbySynthLoopInterval !== null) {
    clearInterval(activeHobbySynthLoopInterval);
    activeHobbySynthLoopInterval = null;
  }

  stopPreviewAudio();

  currentHobbyAlarmState = {
    isPlaying: false,
    taskId: '',
    taskTitle: '',
    audioName: '',
  };
  notifyHobbyAlarmListeners();
}

/**
 * Stop test preview audio
 */
export function stopPreviewAudio(): void {
  if (previewAudioElement) {
    try {
      previewAudioElement.pause();
      previewAudioElement.currentTime = 0;
    } catch {}
    previewAudioElement = null;
  }
}

/**
 * Test preview an MP3 audio URL
 */
export function playPreviewMp3(audioUrl: string, onEnded?: () => void): void {
  stopPreviewAudio();
  try {
    const audio = new Audio(audioUrl);
    audio.volume = 0.9;
    previewAudioElement = audio;
    if (onEnded) {
      audio.onended = onEnded;
    }
    audio.play().catch((err) => {
      console.warn('Preview play error:', err);
    });
  } catch (err) {
    console.warn('Could not preview audio:', err);
  }
}

/**
 * Start looping synthesized musical motif when no MP3 file is attached
 */
function playLoopingSynthesizedChime(type: string = 'energetic_beat'): void {
  const triggerCycle = () => {
    try {
      const ctx = initAudioContext();
      const now = ctx.currentTime;

      if (type === 'acoustic_melody') {
        // Melodious acoustic guitar-like triad arpeggio
        const notes = [
          { f: 261.63, t: 0, d: 0.6 },    // C4
          { f: 329.63, t: 0.2, d: 0.6 },  // E4
          { f: 392.00, t: 0.4, d: 0.8 },  // G4
          { f: 493.88, t: 0.6, d: 1.0 },  // B4
          { f: 523.25, t: 0.9, d: 1.2 },  // C5
        ];
        notes.forEach((n) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(n.f, now + n.t);
          gain.gain.setValueAtTime(0.01, now + n.t);
          gain.gain.exponentialRampToValueAtTime(0.28, now + n.t + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + n.t);
          osc.stop(now + n.t + n.d);
        });
      } else if (type === 'lofi_wake') {
        // Warm mellow Lo-Fi chord
        const chords = [329.63, 392.0, 493.88, 587.33]; // Em7
        chords.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.01, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.08 + 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + 1.8);
        });
      } else {
        // Energetic beat pattern (Default)
        const notes = [
          { f: 440, t: 0, d: 0.15 },
          { f: 554.37, t: 0.14, d: 0.15 },
          { f: 659.25, t: 0.28, d: 0.18 },
          { f: 880, t: 0.44, d: 0.5 },
          { f: 1108.73, t: 0.60, d: 0.6 },
        ];
        notes.forEach((n) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(n.f, now + n.t);
          gain.gain.setValueAtTime(0.01, now + n.t);
          gain.gain.exponentialRampToValueAtTime(0.3, now + n.t + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + n.t);
          osc.stop(now + n.t + n.d);
        });
      }

      if (navigator.vibrate) {
        navigator.vibrate([150, 80, 150, 80, 300]);
      }
    } catch (e) {
      console.warn('Synthesizer loop error:', e);
    }
  };

  triggerCycle();
  activeHobbySynthLoopInterval = window.setInterval(triggerCycle, 2200);
}

/**
 * Start continuous alarm specifically for Hobby tasks.
 * Loops automatically until stopContinuousHobbyAlarm() is called!
 */
export async function startContinuousHobbyAlarm(params: {
  taskId: string;
  title: string;
  audioUrl?: string | null;
  audioType?: 'custom_mp3' | 'energetic_beat' | 'acoustic_melody' | 'lofi_wake';
  audioName?: string;
}): Promise<void> {
  // Clear any existing active alarm
  stopContinuousHobbyAlarm();

  const finalAudioName = params.audioName || (params.audioUrl ? 'Audio MP3 Pilihan' : 'Melodi Bangun Hobi');

  currentHobbyAlarmState = {
    isPlaying: true,
    taskId: params.taskId,
    taskTitle: params.title,
    audioName: finalAudioName,
  };
  notifyHobbyAlarmListeners();

  // If custom MP3 URL is provided
  if (params.audioUrl) {
    try {
      const audio = new Audio(params.audioUrl);
      audio.loop = true;
      audio.volume = 1.0;
      activeHobbyAudioElement = audio;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Autoplay blocked by browser policy, using synth loop fallback:', err);
          playLoopingSynthesizedChime(params.audioType || 'energetic_beat');
        });
      }
      return;
    } catch (err) {
      console.warn('Failed to start MP3 audio element, using synth fallback:', err);
    }
  }

  // Fallback / Preset Synthesized Tune
  playLoopingSynthesizedChime(params.audioType || 'energetic_beat');
}

