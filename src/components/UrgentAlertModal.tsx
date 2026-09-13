import React, { memo, useState, useEffect } from 'react';
import { ScheduleItem } from '../types';
import {
  BellRing,
  CheckCircle2,
  Clock,
  FastForward,
  X,
  Sparkles,
  Volume2,
  Zap,
  HeartHandshake,
  Loader2,
  Mic,
  Music,
  Square,
} from 'lucide-react';
import {
  playScheduleAlertChime,
  playMotivationalWakeupChime,
  startContinuousHobbyAlarm,
  stopContinuousHobbyAlarm,
  subscribeHobbyAlarmState,
  speakText,
  initAudioContext,
} from '../utils/audio';
import { getHobbyAudio, GLOBAL_HOBBY_AUDIO_KEY } from '../utils/hobbyAudioStorage';
import { fetchAiMicroStep } from '../services/aiService';

interface UrgentAlertModalProps {
  task: ScheduleItem | null;
  isOpen: boolean;
  onClose: () => void;
  onCompleteTask: (id: string) => void;
  onShiftTask15m: (id: string) => void;
  onOpenAiCompanion?: (mode: 'micro_step' | 'dynamic_evaluator', task: ScheduleItem) => void;
}

export const UrgentAlertModal: React.FC<UrgentAlertModalProps> = memo(({
  task,
  isOpen,
  onClose,
  onCompleteTask,
  onShiftTask15m,
  onOpenAiCompanion,
}) => {
  const [inlineMicroStep, setInlineMicroStep] = useState<string>('');
  const [isLoadingMicro, setIsLoadingMicro] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isHobbyAudioPlaying, setIsHobbyAudioPlaying] = useState<boolean>(false);
  const [activeHobbyAudioName, setActiveHobbyAudioName] = useState<string>('');

  // Subscribe to hobby alarm state
  useEffect(() => {
    const unsub = subscribeHobbyAlarmState((state) => {
      setIsHobbyAudioPlaying(state.isPlaying);
      if (state.isPlaying) {
        setActiveHobbyAudioName(state.audioName);
      }
    });
    return () => unsub();
  }, []);

  // Play continuous alarm for hobby tasks, or standard chime for regular tasks
  useEffect(() => {
    let createdUrl: string | null = null;

    if (isOpen && task) {
      if (task.category === 'music') {
        // Continuous Hobby Audio (MP3 or custom preset)
        const loadAndPlayHobbyAudio = async () => {
          let audioUrl: string | null = null;
          let audioName = task.hobbyAudioName || 'Audio Motivasi Hobi';

          const blobKey = task.hobbyAudioBlobKey || task.id;
          let stored = await getHobbyAudio(blobKey);
          if (!stored) {
            stored = await getHobbyAudio(GLOBAL_HOBBY_AUDIO_KEY);
          }

          if (stored) {
            createdUrl = URL.createObjectURL(stored.blob);
            audioUrl = createdUrl;
            audioName = stored.fileName;
          }

          startContinuousHobbyAlarm({
            taskId: task.id,
            title: task.title,
            audioUrl,
            audioType: task.hobbyAudioType || 'energetic_beat',
            audioName,
          });
        };

        loadAndPlayHobbyAudio();
      } else {
        // Standard short chime for non-hobby tasks
        playScheduleAlertChime();
      }

      // If microStep is already present, prepare it
      if (task.microStep) {
        setInlineMicroStep(task.microStep);
      }
    }

    return () => {
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  const handleStopAudio = () => {
    stopContinuousHobbyAlarm();
    setIsHobbyAudioPlaying(false);
  };

  const handleClose = () => {
    stopContinuousHobbyAlarm();
    onClose();
  };

  const handleComplete = () => {
    stopContinuousHobbyAlarm();
    initAudioContext();
    onCompleteTask(task.id);
    onClose();
  };

  const handleShift = () => {
    stopContinuousHobbyAlarm();
    initAudioContext();
    onShiftTask15m(task.id);
    onClose();
  };

  const handleReplayChime = () => {
    initAudioContext();
    if (task.category === 'music') {
      startContinuousHobbyAlarm({
        taskId: task.id,
        title: task.title,
        audioType: task.hobbyAudioType || 'energetic_beat',
        audioName: task.hobbyAudioName,
      });
    } else {
      playScheduleAlertChime();
    }
  };

  const handleSpeakAiStep = () => {
    const textToSpeak =
      inlineMicroStep ||
      task.microStep ||
      `Ayo mulai ${task.title}. Ambil langkah pertama yang paling ringan sekarang.`;
    setIsSpeaking(true);
    speakText(textToSpeak, () => setIsSpeaking(false));
  };

  const handleQuickMicroStep = async () => {
    if (task.microStep) {
      setInlineMicroStep(task.microStep);
      handleSpeakAiStep();
      return;
    }
    setIsLoadingMicro(true);
    try {
      const step = await fetchAiMicroStep(task.title);
      setInlineMicroStep(step);
      speakText(step);
    } catch (e) {
      const fallback = 'Coba mulai dari langkah paling santai: siapkan dulu perlengkapanmu di meja.';
      setInlineMicroStep(fallback);
      speakText(fallback);
    } finally {
      setIsLoadingMicro(false);
    }
  };

  const isHobbyItem = task.category === 'music' || task.motivationAudioTone !== undefined;

  return (
    <div
      id="urgent-alert-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="urgent-alert-card"
        className="w-full max-w-lg bg-slate-900 border-2 border-amber-500/80 rounded-3xl p-6 sm:p-7 text-white shadow-2xl relative overflow-hidden ring-4 ring-amber-500/20"
      >
        {/* Glowing Ambient Gradient */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-amber-500/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-orange-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header Alert Tag */}
        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs uppercase px-3.5 py-1.5 rounded-full shadow-md animate-pulse">
            <BellRing className="w-4 h-4" />
            <span>{isHobbyItem ? 'NOTIF MOTIVASI HOBBY' : 'ALARM WAKTU KEGIATAN'}</span>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup banner pop-up"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="mt-5 text-center relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 mb-3 shadow-inner">
            {isHobbyItem ? (
              <Music className="w-8 h-8 animate-bounce" />
            ) : (
              <Clock className="w-8 h-8 animate-bounce" />
            )}
          </div>

          <div className="text-sm font-semibold text-amber-300 font-mono flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Waktu Sekarang: {task.time} WIB</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight">
            {task.title}
          </h2>

          {/* Special Hobby Wake-Up Notification Badge & Active Audio info */}
          {isHobbyItem && (
            <div className="mt-2.5 flex flex-col items-center gap-1.5">
              <div className="text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl py-1 px-3 inline-flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Notif Audio Hobi: Berputar Terus Sampai Anda Stop</span>
              </div>
              {activeHobbyAudioName && (
                <span className="text-[11px] font-semibold text-purple-300 flex items-center gap-1">
                  <Music className="w-3 h-3 text-purple-400" />
                  <span>Memutar: {activeHobbyAudioName}</span>
                </span>
              )}
            </div>
          )}

          {/* Micro-Step Display if available or triggered */}
          {inlineMicroStep || task.microStep ? (
            <div className="mt-3 bg-amber-500/15 border border-amber-400/40 rounded-2xl p-3.5 text-left animate-in fade-in">
              <div className="flex items-center justify-between text-amber-300 font-bold text-xs mb-1">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>AI Micro-Step (Langkah Awal Ringan):</span>
                </div>
                <button
                  type="button"
                  onClick={handleSpeakAiStep}
                  disabled={isSpeaking}
                  className="flex items-center gap-1 text-[11px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 px-2 py-0.5 rounded-md transition-colors"
                  title="Dengarkan suara AI"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>{isSpeaking ? 'Berbicara...' : 'Dengar Suara'}</span>
                </button>
              </div>
              <p className="text-white text-sm font-medium leading-relaxed">
                "{inlineMicroStep || task.microStep}"
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-300 mt-2 max-w-md mx-auto">
              Sesi kegiatan ini telah dimulai. Pilih aksi cepat untuk memperbarui progres kegiatan Anda:
            </p>
          )}
        </div>

        {/* AI Assist Helpers */}
        <div className="mt-4 grid grid-cols-2 gap-2 relative z-10">
          <button
            type="button"
            onClick={handleQuickMicroStep}
            disabled={isLoadingMicro}
            className="min-h-[40px] bg-slate-800/90 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
            title="Sederhanakan menjadi aksi fisik pertama yang sangat ringan"
          >
            {isLoadingMicro ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>⚡ AI Micro-Step</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onOpenAiCompanion) {
                onClose();
                onOpenAiCompanion('dynamic_evaluator', task);
              }
            }}
            className="min-h-[40px] bg-slate-800/90 hover:bg-slate-800 text-rose-300 border border-rose-500/30 text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
            title="Lagi malas atau mau nyerah? Dapatkan empati dan solusi reschedule"
          >
            <HeartHandshake className="w-3.5 h-3.5 text-rose-400" />
            <span>🤝 Malas / Mau Nyerah?</span>
          </button>
        </div>

        {/* High-Impact Action Buttons */}
        <div className="mt-4 space-y-2.5 relative z-10">
          {/* STOP CONTINUOUS HOBBY AUDIO BUTTON */}
          {isHobbyItem && isHobbyAudioPlaying && (
            <button
              type="button"
              onClick={handleStopAudio}
              className="w-full min-h-[50px] bg-rose-600 hover:bg-rose-500 text-white font-black text-sm sm:text-base py-3 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 border-2 border-rose-300 active:scale-[0.98] transition-all cursor-pointer animate-pulse"
            >
              <Square className="w-5 h-5 fill-current" />
              <span>BERHENTI PUTAR AUDIO HOBI</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleComplete}
            className="w-full min-h-[50px] bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm sm:text-base py-3 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Selesai / Centang Sekarang</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleShift}
              className="min-h-[46px] bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-amber-500/40 font-bold text-xs sm:text-sm py-2.5 px-3 rounded-2xl flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer"
            >
              <FastForward className="w-4 h-4" />
              <span>Geser +15 Menit</span>
            </button>

            <button
              type="button"
              onClick={handleReplayChime}
              className="min-h-[46px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-bold text-xs sm:text-sm py-2.5 px-3 rounded-2xl flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              <span>{isHobbyItem ? 'Ulangi Notif Motivasi' : 'Ulangi Nada'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

UrgentAlertModal.displayName = 'UrgentAlertModal';

