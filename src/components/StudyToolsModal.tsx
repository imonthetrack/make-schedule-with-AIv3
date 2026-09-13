import React, { useState, useEffect, useRef } from 'react';
import { STUDY_TECHNIQUES } from '../presets';
import { StudyTechnique, ScheduleItem } from '../types';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Zap,
  Volume2,
  CheckCircle,
  Clock,
  ArrowRight,
  BookOpen,
  Brain,
  Target,
  Plus,
} from 'lucide-react';
import { playBeepTone, playScheduleAlertChime, speakText, initAudioContext } from '../utils/audio';

interface StudyToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportToSchedule?: (item: Omit<ScheduleItem, 'id' | 'completed' | 'completedAt'>) => void;
}

export const StudyToolsModal: React.FC<StudyToolsModalProps> = ({
  isOpen,
  onClose,
  onImportToSchedule,
}) => {
  const [selectedTechniqueId, setSelectedTechniqueId] = useState<'pomodoro' | 'feynman' | 'osn_sprint'>('pomodoro');
  
  // Timer state
  const activeTechnique = STUDY_TECHNIQUES.find((t) => t.id === selectedTechniqueId) || STUDY_TECHNIQUES[0];
  const [phase, setPhase] = useState<'work' | 'break'>('work');
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [secondsLeft, setSecondsLeft] = useState<number>(activeTechnique.workMinutes * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // OSN Sprint specific state
  const [osnQuestionIndex, setOsnQuestionIndex] = useState<number>(1);
  const [osnMinutesPerQuestion, setOsnMinutesPerQuestion] = useState<number>(3); // 3, 4, or 5 min

  // Feynman notes state
  const [feynmanTopic, setFeynmanTopic] = useState<string>('');
  const [feynmanExplanation, setFeynmanExplanation] = useState<string>('');

  const timerRef = useRef<number | null>(null);

  // Reset timer whenever technique changes
  const handleSelectTechnique = (tech: StudyTechnique) => {
    setSelectedTechniqueId(tech.id);
    setIsRunning(false);
    setPhase('work');
    setCurrentRound(1);
    if (tech.id === 'osn_sprint') {
      setSecondsLeft(osnMinutesPerQuestion * 60);
      setOsnQuestionIndex(1);
    } else {
      setSecondsLeft(tech.workMinutes * 60);
    }
  };

  // Timer Tick
  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, phase, currentRound, selectedTechniqueId]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    playScheduleAlertChime();

    if (selectedTechniqueId === 'pomodoro') {
      if (phase === 'work') {
        speakText('Waktu fokus pomodoro selesai! Ayo istirahat santai 5 menit.');
        setPhase('break');
        setSecondsLeft(activeTechnique.breakMinutes * 60);
      } else {
        speakText('Istirahat selesai! Siap mulai putaran fokus berikutnya?');
        setPhase('work');
        setCurrentRound((r) => (r >= activeTechnique.rounds ? 1 : r + 1));
        setSecondsLeft(activeTechnique.workMinutes * 60);
      }
    } else if (selectedTechniqueId === 'feynman') {
      if (phase === 'work') {
        speakText('Waktu membaca selesai! Sekarang coba jelaskan konsep ini dengan kalimat sederhanamu.');
        setPhase('break');
        setSecondsLeft(activeTechnique.breakMinutes * 60);
      } else {
        speakText('Sesi Feynman selesai! Catat bagian yang masih membuatmu bingung.');
        setPhase('work');
        setSecondsLeft(activeTechnique.workMinutes * 60);
      }
    } else if (selectedTechniqueId === 'osn_sprint') {
      speakText(`Waktu soal nomor ${osnQuestionIndex} habis! Buat hipotesis dan lanjut ke soal berikutnya.`);
      setOsnQuestionIndex((i) => i + 1);
      setSecondsLeft(osnMinutesPerQuestion * 60);
    }
  };

  const togglePlayPause = () => {
    initAudioContext();
    setIsRunning((prev) => !prev);
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setPhase('work');
    if (selectedTechniqueId === 'osn_sprint') {
      setSecondsLeft(osnMinutesPerQuestion * 60);
    } else {
      setSecondsLeft(activeTechnique.workMinutes * 60);
    }
  };

  const handleNextOsnQuestion = () => {
    initAudioContext();
    playBeepTone(784, 0.1);
    setOsnQuestionIndex((i) => i + 1);
    setSecondsLeft(osnMinutesPerQuestion * 60);
    setIsRunning(true);
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleImportCurrentTechnique = () => {
    if (!onImportToSchedule) return;
    const now = new Date();
    const currentHH = String(now.getHours()).padStart(2, '0');
    const currentMM = String(now.getMinutes()).padStart(2, '0');

    onImportToSchedule({
      time: `${currentHH}:${currentMM}`,
      title: `${activeTechnique.title}: Sesi Belajar Cepat`,
      category: 'study',
      durationMinutes: activeTechnique.workMinutes,
      microStep: activeTechnique.howItWorks[0] || 'Mulai dengan topik pertama.',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      id="study-tools-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="study-tools-card"
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl p-5 sm:p-6 my-auto text-slate-900 relative animate-in zoom-in-95 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-xs">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  Fokus Cepat (Study Tools Engine)
                </h2>
                <span className="text-[10px] font-extrabold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300/80 uppercase tracking-wider">
                  Bukan Jadwal Harian
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Alat bantu & teknik belajar cepat, teruji, dan efisien waktu
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Scrollable */}
        <div className="overflow-y-auto py-4 space-y-5 pr-1 flex-1">
          {/* Technique Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              PILIH TEKNIK BELAJAR:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {STUDY_TECHNIQUES.map((tech) => {
                const isSelected = selectedTechniqueId === tech.id;
                return (
                  <button
                    key={tech.id}
                    type="button"
                    onClick={() => handleSelectTechnique(tech)}
                    className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-2xl">{tech.icon}</span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">
                        {tech.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                        {tech.tagline}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Technique Interactive Box */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-5 shadow-lg border border-slate-700 relative overflow-hidden">
            {/* Technique Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <span className="inline-block text-[11px] font-bold bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full mb-1">
                  {activeTechnique.badge}
                </span>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>{activeTechnique.icon}</span>
                  <span>{activeTechnique.title}</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {activeTechnique.tagline}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  speakText(
                    `Teknik ${activeTechnique.title}. ${activeTechnique.description}`
                  )
                }
                className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl border border-slate-700 transition-colors"
                title="Dengarkan panduan suara AI"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            {/* Countdown Display */}
            <div className="bg-slate-950/60 rounded-2xl p-4 sm:p-5 border border-slate-800 text-center mb-4">
              <div className="flex items-center justify-center gap-2 text-xs text-amber-300 font-bold mb-1">
                {selectedTechniqueId === 'osn_sprint' ? (
                  <span>🎯 WAKTU SOAL NOMOR #{osnQuestionIndex}</span>
                ) : (
                  <span>
                    {phase === 'work' ? '🔥 SESI FOKUS UTAMA' : '☕ ISTIRAHAT TOTAL'}
                    {selectedTechniqueId === 'pomodoro' && ` (Putaran ${currentRound}/${activeTechnique.rounds})`}
                  </span>
                )}
              </div>

              <div className="text-4xl sm:text-5xl font-black tracking-tight font-mono text-white py-1">
                {formatTime(secondsLeft)}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-2.5 mt-3">
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className={`min-h-[44px] px-6 py-2 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer ${
                    isRunning
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <Pause className="w-4 h-4 fill-slate-950" />
                      <span>Jeda</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-slate-950" />
                      <span>Mulai Timer</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResetTimer}
                  className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                  title="Reset timer ke awal"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>

                {selectedTechniqueId === 'osn_sprint' && (
                  <button
                    type="button"
                    onClick={handleNextOsnQuestion}
                    className="min-h-[44px] px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <span>Lanjut Soal #{osnQuestionIndex + 1}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* OSN Sprint Specific Controls */}
            {selectedTechniqueId === 'osn_sprint' && (
              <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/80 mb-3 text-xs flex items-center justify-between flex-wrap gap-2">
                <span className="text-slate-300 font-medium">
                  Alokasi Waktu per Nomor Soal:
                </span>
                <div className="flex items-center gap-1.5">
                  {[3, 4, 5].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => {
                        setOsnMinutesPerQuestion(mins);
                        setSecondsLeft(mins * 60);
                        setIsRunning(false);
                      }}
                      className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                        osnMinutesPerQuestion === mins
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {mins} Menit
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Feynman Explanation Scratchpad */}
            {selectedTechniqueId === 'feynman' && (
              <div className="bg-slate-800/80 rounded-2xl p-3.5 border border-slate-700/80 mb-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold">
                  <Brain className="w-3.5 h-3.5" />
                  <span>Kotak Uraian Sederhana Feynman:</span>
                </div>
                <input
                  type="text"
                  value={feynmanTopic}
                  onChange={(e) => setFeynmanTopic(e.target.value)}
                  placeholder="Nama Konsep (Contoh: Hukum Kekekalan Energi)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-amber-400"
                />
                <textarea
                  value={feynmanExplanation}
                  onChange={(e) => setFeynmanExplanation(e.target.value)}
                  rows={3}
                  placeholder="Jelaskan kembali dengan kata-kata paling mudah seolah mengajarkan anak kelas 5 SD..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-amber-400 resize-none font-sans"
                />
              </div>
            )}

            {/* How It Works Checklist */}
            <div className="space-y-1.5 text-xs text-slate-300">
              <span className="font-bold text-white text-[11px] uppercase tracking-wider block mb-1">
                Langkah Eksekusi:
              </span>
              {activeTechnique.howItWorks.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="leading-relaxed">{step}</p>
                </div>
              ))}
            </div>

            {/* Best for */}
            <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                <strong className="text-slate-200">Sangat Cocok Untuk:</strong>{' '}
                {activeTechnique.bestFor}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
          {onImportToSchedule ? (
            <button
              type="button"
              onClick={handleImportCurrentTechnique}
              className="min-h-[40px] flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Salin Sesi Ini ke Jadwal Hari Ini</span>
            </button>
          ) : (
            <div></div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
