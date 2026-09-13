import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Zap,
  HeartHandshake,
  ArrowRight,
  Clock,
  CheckCircle2,
  Copy,
  Plus,
  Loader2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { fetchAiMicroStep, fetchAiDynamicEvaluator } from '../services/aiService';
import { ScheduleItem } from '../types';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'micro_step' | 'dynamic_evaluator';
  initialInput?: string;
  selectedTask?: ScheduleItem | null;
  onApplyMicroStepToTask?: (taskId: string, microStep: string) => void;
  onAddNewTaskWithMicroStep?: (title: string, microStep: string) => void;
  onApplyShiftSchedule?: (deltaMinutes: number) => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'micro_step',
  initialInput = '',
  selectedTask = null,
  onApplyMicroStepToTask,
  onAddNewTaskWithMicroStep,
  onApplyShiftSchedule,
}) => {
  const [activeTab, setActiveTab] = useState<'micro_step' | 'dynamic_evaluator'>(initialMode);
  
  // Micro-Step state
  const [taskInput, setTaskInput] = useState<string>('');
  const [microStepResult, setMicroStepResult] = useState<string>('');
  const [isLoadingMicroStep, setIsLoadingMicroStep] = useState<boolean>(false);
  const [isCopiedMicroStep, setIsCopiedMicroStep] = useState<boolean>(false);

  // Dynamic Evaluator state
  const [reasonInput, setReasonInput] = useState<string>('');
  const [evaluatorResult, setEvaluatorResult] = useState<string>('');
  const [suggestedShiftMinutes, setSuggestedShiftMinutes] = useState<number>(15);
  const [isLoadingEvaluator, setIsLoadingEvaluator] = useState<boolean>(false);
  const [hasShifted, setHasShifted] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setHasShifted(false);
      setIsCopiedMicroStep(false);

      if (initialMode === 'micro_step') {
        if (selectedTask?.title) {
          setTaskInput(selectedTask.title);
        } else if (initialInput) {
          setTaskInput(initialInput);
        }
      } else {
        if (initialInput) {
          setReasonInput(initialInput);
        }
      }
    }
  }, [isOpen, initialMode, initialInput, selectedTask]);

  if (!isOpen) return null;

  // Handle Micro-Step Generation
  const handleGenerateMicroStep = async (overrideInput?: string) => {
    const textToProcess = (overrideInput || taskInput).trim();
    if (!textToProcess) return;

    setIsLoadingMicroStep(true);
    setMicroStepResult('');
    try {
      const result = await fetchAiMicroStep(textToProcess);
      setMicroStepResult(result);
    } catch (error) {
      console.error(error);
      setMicroStepResult('Coba buka dulu perlengkapanmu, siapkan di meja tanpa tekanan.');
    } finally {
      setIsLoadingMicroStep(false);
    }
  };

  // Handle Dynamic Evaluator
  const handleEvaluateReason = async (overrideInput?: string) => {
    const textToProcess = (overrideInput || reasonInput).trim();
    if (!textToProcess) return;

    setIsLoadingEvaluator(true);
    setEvaluatorResult('');
    setHasShifted(false);
    try {
      const { response, suggestedShiftMinutes: shiftMins } = await fetchAiDynamicEvaluator(
        textToProcess,
        selectedTask?.title
      );
      setEvaluatorResult(response);
      setSuggestedShiftMinutes(shiftMins || 15);
    } catch (error) {
      console.error(error);
      setEvaluatorResult('Wajar banget kalau lelah. Istirahat sejenak 15 menit ya biar pikiranmu kembali segar.');
      setSuggestedShiftMinutes(15);
    } finally {
      setIsLoadingEvaluator(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopiedMicroStep(true);
    setTimeout(() => setIsCopiedMicroStep(false), 2000);
  };

  const handleApplyShift = () => {
    if (onApplyShiftSchedule) {
      onApplyShiftSchedule(suggestedShiftMinutes);
      setHasShifted(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Rest Guard AI Engine</span>
                <span className="text-[10px] uppercase font-bold bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
                  Gemini 3.8
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Penyederhana tugas anti-malas & teman akuntabilitas anti-burnout
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('micro_step')}
            className={`min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'micro_step'
                ? 'bg-white text-blue-700 shadow-xs border border-blue-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className={`w-4 h-4 ${activeTab === 'micro_step' ? 'text-amber-500' : 'text-slate-400'}`} />
            <span>1. Micro-Step Notifier</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dynamic_evaluator')}
            className={`min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'dynamic_evaluator'
                ? 'bg-white text-rose-700 shadow-xs border border-rose-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HeartHandshake className={`w-4 h-4 ${activeTab === 'dynamic_evaluator' ? 'text-rose-500' : 'text-slate-400'}`} />
            <span>2. Dynamic Evaluator</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: AI MICRO-STEP NOTIFIER */}
          {activeTab === 'micro_step' && (
            <div className="space-y-4">
              <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3.5 text-xs text-blue-900">
                <div className="font-bold flex items-center gap-1.5 text-blue-950 mb-1">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span>Prinsip Micro-Step: Potong Rasa Malas di Gerakan Pertama</span>
                </div>
                <p className="text-blue-800 leading-relaxed">
                  Tugas berat dipecah menjadi 1 aksi fisik mikroskopis paling ringan (1–2 kalimat).
                  Tidak menyuruh menyelesaikan tugas, cukup mulai tanpa beban!
                </p>
              </div>

              {selectedTask && (
                <div className="text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
                  <span className="text-slate-600">
                    Target Tugas: <strong className="text-slate-900">{selectedTask.title}</strong> ({selectedTask.time})
                  </span>
                  <button
                    type="button"
                    onClick={() => setTaskInput(selectedTask.title)}
                    className="text-blue-600 hover:underline font-bold"
                  >
                    Gunakan
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tugas atau Kegiatan yang Terasa Berat:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleGenerateMicroStep();
                      }
                    }}
                    placeholder="Contoh: Kerjakan 10 Soal Matematika OSN / Latihan Biola"
                    className="min-h-[44px] flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:outline-blue-600 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => handleGenerateMicroStep()}
                    disabled={!taskInput.trim() || isLoadingMicroStep}
                    className="min-h-[44px] px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    {isLoadingMicroStep ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-amber-300" />
                    )}
                    <span>Sederhanakan</span>
                  </button>
                </div>
              </div>

              {/* Quick Prompt Chips */}
              <div>
                <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
                  Coba Contoh Tugas Berat:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Kerjakan 10 Soal Matematika OSN',
                    'Latihan Biola Tangga Nada',
                    'Tulis Bab 1 Skripsi / Esai 2000 Kata',
                    'Bereskan Meja & Kamar Berantakan',
                    'Lari Pagi Keliling Komplek',
                  ].map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => {
                        setTaskInput(example);
                        handleGenerateMicroStep(example);
                      }}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-2.5 py-1.5 rounded-lg border border-slate-200/80 transition-colors cursor-pointer"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              {/* Result Card */}
              {microStepResult && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50/70 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 shadow-xs relative animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-900 uppercase tracking-wider bg-amber-200/80 px-2.5 py-0.5 rounded-full">
                      <Zap className="w-3.5 h-3.5 text-amber-700 fill-amber-500" />
                      <span>Micro-Step Pertama (Tanpa Tekanan)</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleCopy(microStepResult)}
                      className="text-xs text-amber-800 hover:text-amber-950 flex items-center gap-1 font-semibold"
                    >
                      {isCopiedMicroStep ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopiedMicroStep ? 'Disalin!' : 'Salin'}</span>
                    </button>
                  </div>

                  <p className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                    "{microStepResult}"
                  </p>

                  <div className="mt-4 pt-3 border-t border-amber-200/80 flex flex-wrap gap-2">
                    {selectedTask && onApplyMicroStepToTask && (
                      <button
                        type="button"
                        onClick={() => {
                          onApplyMicroStepToTask(selectedTask.id, microStepResult);
                          onClose();
                        }}
                        className="min-h-[40px] flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Pasang di Tugas "{selectedTask.title}"</span>
                      </button>
                    )}

                    {onAddNewTaskWithMicroStep && (
                      <button
                        type="button"
                        onClick={() => {
                          onAddNewTaskWithMicroStep(taskInput, microStepResult);
                          onClose();
                        }}
                        className="min-h-[40px] flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tambahkan Sebagai Jadwal Baru</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AI DYNAMIC EVALUATOR */}
          {activeTab === 'dynamic_evaluator' && (
            <div className="space-y-4">
              <div className="bg-rose-50/80 border border-rose-200/80 rounded-2xl p-3.5 text-xs text-rose-900">
                <div className="font-bold flex items-center gap-1.5 text-rose-950 mb-1">
                  <HeartHandshake className="w-4 h-4 text-rose-600" />
                  <span>Teman Akuntabilitas: Empati Penuh, Solusi Tanpa Rasa Bersalah</span>
                </div>
                <p className="text-rose-800 leading-relaxed">
                  Lagi mager, pusing, atau ingin menyerah? Sampaikan alasanmu. AI akan merespon dengan empati
                  hangat dan menyarankan penyesuaian jadwal (reschedule) yang manusiawi.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Apa yang Sedang Kamu Rasakan / Alasan Menunda?
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={reasonInput}
                    onChange={(e) => setReasonInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleEvaluateReason();
                      }
                    }}
                    placeholder="Contoh: Saya malas banget, kepalanya pusing habis sekolah..."
                    className="min-h-[44px] flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:outline-rose-600 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => handleEvaluateReason()}
                    disabled={!reasonInput.trim() || isLoadingEvaluator}
                    className="min-h-[44px] px-4 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    {isLoadingEvaluator ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <HeartHandshake className="w-4 h-4" />
                    )}
                    <span>Curhat</span>
                  </button>
                </div>
              </div>

              {/* Quick Reason Chips */}
              <div>
                <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
                  Pilih Alasan Cepat:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Saya malas banget, kepalanya pusing habis sekolah.',
                    'Soal fisika ini terlalu susah, saya mau menyerah aja.',
                    'Mata ngantuk berat, butuh rebahan sebentar.',
                    'Overwhelmed, terlalu banyak hal yang harus dipikirkan.',
                  ].map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => {
                        setReasonInput(example);
                        handleEvaluateReason(example);
                      }}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-2.5 py-1.5 rounded-lg border border-slate-200/80 transition-colors cursor-pointer"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              {/* Evaluator Result Card */}
              {evaluatorResult && (
                <div className="bg-gradient-to-br from-rose-50 to-orange-50/60 border-2 border-rose-300 rounded-2xl p-4 sm:p-5 shadow-xs relative animate-in fade-in slide-in-from-bottom-2 duration-200 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-rose-900 uppercase tracking-wider bg-rose-200/80 px-2.5 py-0.5 rounded-full">
                      <HeartHandshake className="w-3.5 h-3.5 text-rose-700" />
                      <span>Respon Teman Akuntabilitas</span>
                    </span>

                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-rose-600" />
                      <span>Saran Geser: +{suggestedShiftMinutes} menit</span>
                    </span>
                  </div>

                  <p className="text-sm sm:text-base text-slate-800 leading-relaxed font-medium">
                    "{evaluatorResult}"
                  </p>

                  {/* Reschedule Action */}
                  <div className="pt-2 border-t border-rose-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">
                      Tidak apa-apa istirahat sejenak untuk mencegah burnout.
                    </span>

                    <button
                      type="button"
                      onClick={handleApplyShift}
                      disabled={hasShifted}
                      className={`min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs ${
                        hasShifted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-rose-600 hover:bg-rose-700 text-white active:scale-95'
                      }`}
                    >
                      {hasShifted ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Jadwal Berhasil Digeser +{suggestedShiftMinutes}m!</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4" />
                          <span>Terapkan Geser Jadwal (+{suggestedShiftMinutes} Menit)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Rest Guard AI dirancang untuk memutus rasa bersalah & memicu aksi.</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="font-bold text-slate-700 hover:text-slate-900 px-3 py-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
