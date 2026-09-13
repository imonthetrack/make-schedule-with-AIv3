import React, { useState, useRef, useEffect } from 'react';
import { getCurrentTimeHHMM } from '../utils/storage';
import {
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  FileText,
  Zap,
  Loader2,
  Sparkles,
  Music,
  Upload,
  Play,
  Square,
  Check,
} from 'lucide-react';
import { ScheduleItem } from '../types';
import { fetchAiMicroStep } from '../services/aiService';
import { saveHobbyAudio } from '../utils/hobbyAudioStorage';
import { playPreviewMp3, stopPreviewAudio, initAudioContext, playMotivationalWakeupChime } from '../utils/audio';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newTask: Omit<ScheduleItem, 'id' | 'completed'>) => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [time, setTime] = useState<string>(getCurrentTimeHHMM());
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<'study' | 'music' | 'break' | 'work' | 'personal'>('personal');
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [microStep, setMicroStep] = useState<string>('');
  const [motivationTone, setMotivationTone] = useState<'energetic' | 'fanfare' | 'gentle' | 'voice'>('energetic');
  const [isLoadingMicroStep, setIsLoadingMicroStep] = useState<boolean>(false);

  // Hobby Custom MP3 settings
  const [hobbyAudioType, setHobbyAudioType] = useState<'custom_mp3' | 'energetic_beat' | 'acoustic_melody' | 'lofi_wake'>('custom_mp3');
  const [customMp3File, setCustomMp3File] = useState<File | null>(null);
  const [customMp3Name, setCustomMp3Name] = useState<string>('');
  const [customMp3PreviewUrl, setCustomMp3PreviewUrl] = useState<string | null>(null);
  const [isPlayingMp3Preview, setIsPlayingMp3Preview] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      stopPreviewAudio();
      if (customMp3PreviewUrl) {
        URL.revokeObjectURL(customMp3PreviewUrl);
      }
    };
  }, [customMp3PreviewUrl]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    stopPreviewAudio();
    setIsPlayingMp3Preview(false);
    const file = e.target.files?.[0];
    if (!file) return;

    if (customMp3PreviewUrl) {
      URL.revokeObjectURL(customMp3PreviewUrl);
    }

    const url = URL.createObjectURL(file);
    setCustomMp3File(file);
    setCustomMp3Name(file.name);
    setCustomMp3PreviewUrl(url);
    setHobbyAudioType('custom_mp3');
  };

  const handleTogglePlayPreview = () => {
    initAudioContext();
    if (isPlayingMp3Preview) {
      stopPreviewAudio();
      setIsPlayingMp3Preview(false);
      return;
    }

    if (hobbyAudioType === 'custom_mp3' && customMp3PreviewUrl) {
      setIsPlayingMp3Preview(true);
      playPreviewMp3(customMp3PreviewUrl, () => setIsPlayingMp3Preview(false));
    } else {
      setIsPlayingMp3Preview(true);
      playMotivationalWakeupChime(motivationTone);
      setTimeout(() => setIsPlayingMp3Preview(false), 2500);
    }
  };

  const handleGenerateMicro = async () => {
    if (!title.trim()) return;
    setIsLoadingMicroStep(true);
    try {
      const step = await fetchAiMicroStep(title.trim());
      setMicroStep(step);
    } catch (e) {
      setMicroStep('Siapkan dulu peralatan untuk tugas ini di meja.');
    } finally {
      setIsLoadingMicroStep(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !time.trim()) return;

    let blobKey: string | undefined = undefined;
    if (category === 'music' && customMp3File) {
      blobKey = `hobby-audio-${Date.now()}`;
      try {
        await saveHobbyAudio(blobKey, customMp3File, customMp3Name || customMp3File.name);
      } catch (err) {
        console.warn('Failed to save mp3 in AddTaskModal:', err);
      }
    }

    onAdd({
      time,
      title: title.trim(),
      category,
      durationMinutes: 30,
      microStep: microStep.trim() || undefined,
      motivationAudioTone: category === 'music' ? motivationTone : undefined,
      hobbyAudioType: category === 'music' ? hobbyAudioType : undefined,
      hobbyAudioName: category === 'music' ? (customMp3Name || 'Melodi Bangun Hobi') : undefined,
      hobbyAudioBlobKey: blobKey,
    });

    stopPreviewAudio();
    setTitle('');
    setNotes('');
    setMicroStep('');
    setShowNotes(false);
    setCustomMp3File(null);
    setCustomMp3Name('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-md shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            <span>Tambah Jadwal Cepat</span>
          </h3>
          <button
            id="close-add-modal-btn"
            type="button"
            onClick={onClose}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* 1. Nama Kegiatan */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                1. Nama Kegiatan
              </label>
              <button
                type="button"
                onClick={handleGenerateMicro}
                disabled={!title.trim() || isLoadingMicroStep}
                className="text-[11px] font-bold text-amber-700 hover:text-amber-800 disabled:text-slate-400 flex items-center gap-1 bg-amber-50 hover:bg-amber-100 disabled:bg-transparent px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                title="Pecah menjadi aksi fisik pertama yang sangat ringan"
              >
                {isLoadingMicroStep ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                )}
                <span>AI Micro-Step</span>
              </button>
            </div>
            <input
              id="new-task-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Kerjakan 10 Soal Matematika OSN"
              required
              autoFocus
              className="min-h-[44px] w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-blue-500 font-medium"
            />

            {/* Generated Micro-Step preview if available */}
            {microStep && (
              <div className="mt-2 bg-amber-50 border border-amber-200/80 rounded-xl p-2.5 flex items-start gap-2 text-xs text-amber-900 animate-in fade-in">
                <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold">Langkah Pertama Anti-Malas:</span>
                  <p className="font-medium mt-0.5">"{microStep}"</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMicroStep('')}
                  className="text-amber-600 hover:text-amber-900 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* 2. Waktu Mulai */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              2. Waktu Mulai (WIB)
            </label>
            <input
              id="new-task-time-input"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="min-h-[44px] w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-blue-500"
            />
          </div>

          {/* 3. Kategori */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              3. Kategori
            </label>
            <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
              {[
                { id: 'study', label: 'Belajar' },
                { id: 'music', label: 'Hobby / Skill' },
                { id: 'break', label: 'Istirahat' },
                { id: 'work', label: 'Kerja' },
                { id: 'personal', label: 'Pribadi' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  id={`cat-btn-${cat.id}`}
                  type="button"
                  onClick={() => setCategory(cat.id as any)}
                  className={`min-h-[40px] py-2 px-2 rounded-xl border text-center transition-all ${
                    category === cat.id
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Special Hobby MP3 Audio Settings (HANYA UNTUK KATEGORI HOBI) */}
            {category === 'music' && (
              <div className="mt-2.5 bg-purple-50/90 border border-purple-300/80 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-purple-700" />
                    <span>Audio Alarm Hobi (Ketentuan MP3):</span>
                  </span>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                    Khusus Hobi
                  </span>
                </div>

                <p className="text-[11px] text-purple-900 mb-2 leading-tight">
                  Audio ini akan <strong>langsung otomatis berputar</strong> saat jam hobi tiba dan terus berputar hingga Anda klik <strong>Berhenti</strong>.
                </p>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/mp3,audio/mpeg,audio/*,.mp3"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {customMp3Name ? (
                  <div className="bg-white border border-purple-300 rounded-lg p-2.5 flex items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Music className="w-4 h-4 text-purple-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {customMp3Name}
                        </p>
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" /> File MP3 Terpasang
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={handleTogglePlayPreview}
                        className={`text-[11px] font-bold py-1 px-2.5 rounded-md flex items-center gap-1 cursor-pointer transition-colors ${
                          isPlayingMp3Preview
                            ? 'bg-rose-600 text-white'
                            : 'bg-purple-600 text-white hover:bg-purple-700'
                        }`}
                      >
                        {isPlayingMp3Preview ? (
                          <>
                            <Square className="w-3 h-3 fill-current" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            <span>Tes</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          stopPreviewAudio();
                          setIsPlayingMp3Preview(false);
                          setCustomMp3File(null);
                          setCustomMp3Name('');
                        }}
                        className="text-[11px] text-slate-400 hover:text-rose-600 px-1.5 py-1"
                        title="Hapus file"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full bg-white hover:bg-purple-100/60 border-2 border-dashed border-purple-300 rounded-lg py-2.5 px-3 text-center cursor-pointer transition-colors flex items-center justify-center gap-2"
                    >
                      <Upload className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-bold text-purple-900">
                        + Pilih File MP3 dari HP / Laptop
                      </span>
                    </button>

                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span>Atau nada bawaan:</span>
                      <div className="flex items-center gap-1">
                        {[
                          { id: 'energetic_beat', label: 'Beat Semangat' },
                          { id: 'acoustic_melody', label: 'Akustik Gitar' },
                          { id: 'lofi_wake', label: 'Lo-Fi' },
                        ].map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              stopPreviewAudio();
                              setIsPlayingMp3Preview(false);
                              setHobbyAudioType(preset.id as any);
                              setCustomMp3Name(preset.label);
                            }}
                            className="text-[10px] font-semibold bg-white hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded cursor-pointer text-purple-800"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Collapsible: Catatan Tambahan */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowNotes(!showNotes)}
              className="flex items-center justify-between w-full text-xs font-semibold text-slate-500 hover:text-slate-800 py-1"
            >
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Catatan Tambahan (Opsional)</span>
              </span>
              {showNotes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showNotes && (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tulis detail materi, target halaman, atau perlengkapan..."
                rows={2}
                className="mt-2 w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-blue-500 font-medium"
              />
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
            >
              Batal
            </button>
            <button
              id="submit-new-task-btn"
              type="submit"
              className="min-h-[44px] flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              + Simpan Jadwal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
