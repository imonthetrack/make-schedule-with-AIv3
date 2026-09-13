import React, { useState, useEffect, useRef } from 'react';
import { ScheduleItem } from '../types';
import {
  saveHobbyAudio,
  getHobbyAudio,
  deleteHobbyAudio,
  GLOBAL_HOBBY_AUDIO_KEY,
} from '../utils/hobbyAudioStorage';
import {
  playPreviewMp3,
  stopPreviewAudio,
  playMotivationalWakeupChime,
  initAudioContext,
} from '../utils/audio';
import {
  X,
  Upload,
  Music,
  Play,
  Square,
  Check,
  AlertCircle,
  Sparkles,
  FileAudio,
  Trash2,
} from 'lucide-react';

interface HobbyAudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetTask?: ScheduleItem | null;
  task?: ScheduleItem | null;
  onSaveTaskAudio?: (taskId: string, audioConfig: {
    hobbyAudioType: 'custom_mp3' | 'energetic_beat' | 'acoustic_melody' | 'lofi_wake';
    hobbyAudioName: string;
    hobbyAudioBlobKey?: string;
    applyToAllHobby?: boolean;
  }) => void;
  onSaveAudio?: (
    taskId: string,
    audioType: 'custom_mp3' | 'energetic_beat' | 'acoustic_melody' | 'lofi_wake',
    audioName: string,
    blobKey?: string
  ) => void;
}

export const HobbyAudioSettingsModal: React.FC<HobbyAudioSettingsModalProps> = ({
  isOpen,
  onClose,
  targetTask: propTargetTask,
  task: propTask,
  onSaveTaskAudio,
  onSaveAudio,
}) => {
  const targetTask = propTargetTask || propTask || null;
  const [selectedType, setSelectedType] = useState<
    'custom_mp3' | 'energetic_beat' | 'acoustic_melody' | 'lofi_wake'
  >('custom_mp3');
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customFileName, setCustomFileName] = useState<string>('');
  const [customFilePreviewUrl, setCustomFilePreviewUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [applyToAllHobby, setApplyToAllHobby] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load existing audio setting if task already has one
  useEffect(() => {
    if (!isOpen) {
      stopPreviewAudio();
      setIsPlayingPreview(false);
      return;
    }

    setErrorMessage('');
    if (targetTask) {
      const type = targetTask.hobbyAudioType || 'custom_mp3';
      setSelectedType(type);
      setCustomFileName(targetTask.hobbyAudioName || '');

      const blobKey = targetTask.hobbyAudioBlobKey || targetTask.id || GLOBAL_HOBBY_AUDIO_KEY;
      getHobbyAudio(blobKey).then((stored) => {
        if (stored) {
          const url = URL.createObjectURL(stored.blob);
          setCustomFilePreviewUrl(url);
          setCustomFileName(stored.fileName);
        }
      });
    }
  }, [isOpen, targetTask]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      stopPreviewAudio();
      if (customFilePreviewUrl) {
        URL.revokeObjectURL(customFilePreviewUrl);
      }
    };
  }, [customFilePreviewUrl]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('');
    stopPreviewAudio();
    setIsPlayingPreview(false);

    const file = e.target.files?.[0];
    if (!file) return;

    // Validate MP3 or audio
    const isMp3 =
      file.type.includes('audio') ||
      file.name.toLowerCase().endsWith('.mp3') ||
      file.name.toLowerCase().endsWith('.m4a') ||
      file.name.toLowerCase().endsWith('.wav');

    if (!isMp3) {
      setErrorMessage('Harap unggah file berformat .mp3 atau file audio yang valid.');
      return;
    }

    // Limit check (e.g. 25MB max for fast offline caching)
    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('Ukuran file maksimal 25 MB agar tersimpan cepat & lancar.');
      return;
    }

    if (customFilePreviewUrl) {
      URL.revokeObjectURL(customFilePreviewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setCustomFile(file);
    setCustomFileName(file.name);
    setCustomFilePreviewUrl(objectUrl);
    setSelectedType('custom_mp3');
  };

  const handleTogglePlayPreview = () => {
    initAudioContext();

    if (isPlayingPreview) {
      stopPreviewAudio();
      setIsPlayingPreview(false);
      return;
    }

    if (selectedType === 'custom_mp3') {
      if (!customFilePreviewUrl) {
        setErrorMessage('Silakan pilih file MP3 terlebih dahulu untuk di-tes.');
        return;
      }
      setIsPlayingPreview(true);
      playPreviewMp3(customFilePreviewUrl, () => {
        setIsPlayingPreview(false);
      });
    } else {
      // Synthesized presets
      setIsPlayingPreview(true);
      if (selectedType === 'acoustic_melody') {
        playMotivationalWakeupChime('gentle');
      } else if (selectedType === 'lofi_wake') {
        playMotivationalWakeupChime('fanfare');
      } else {
        playMotivationalWakeupChime('energetic');
      }
      setTimeout(() => {
        setIsPlayingPreview(false);
      }, 3000);
    }
  };

  const handleClearCustomFile = async () => {
    stopPreviewAudio();
    setIsPlayingPreview(false);
    if (customFilePreviewUrl) {
      URL.revokeObjectURL(customFilePreviewUrl);
    }
    setCustomFile(null);
    setCustomFileName('');
    setCustomFilePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (targetTask?.hobbyAudioBlobKey) {
      await deleteHobbyAudio(targetTask.hobbyAudioBlobKey);
    }
  };

  const handleSave = async () => {
    setErrorMessage('');
    setIsSaving(true);
    stopPreviewAudio();

    try {
      let blobKey = targetTask?.hobbyAudioBlobKey || `hobby-audio-${targetTask?.id || Date.now()}`;

      if (selectedType === 'custom_mp3') {
        if (!customFile && !customFilePreviewUrl) {
          setErrorMessage('Silakan unggah file MP3 atau pilih salah satu nada bawaan.');
          setIsSaving(false);
          return;
        }

        if (customFile) {
          await saveHobbyAudio(blobKey, customFile, customFileName);
          if (applyToAllHobby) {
            await saveHobbyAudio(GLOBAL_HOBBY_AUDIO_KEY, customFile, customFileName);
          }
        }
      }

      const finalAudioName =
        selectedType === 'custom_mp3'
          ? customFileName || 'Audio Kustom Hobi.mp3'
          : selectedType === 'acoustic_melody'
          ? 'Melodi Akustik Gitar'
          : selectedType === 'lofi_wake'
          ? 'Lo-Fi Wake-Up Groove'
          : 'Energetic Beat Motivasi';

      if (targetTask) {
        if (onSaveTaskAudio) {
          onSaveTaskAudio(targetTask.id, {
            hobbyAudioType: selectedType,
            hobbyAudioName: finalAudioName,
            hobbyAudioBlobKey: selectedType === 'custom_mp3' ? blobKey : undefined,
            applyToAllHobby,
          });
        } else if (onSaveAudio) {
          onSaveAudio(
            targetTask.id,
            selectedType,
            finalAudioName,
            selectedType === 'custom_mp3' ? blobKey : undefined
          );
        }
      }

      onClose();
    } catch (err) {
      console.error('Failed to save hobby audio:', err);
      setErrorMessage('Gagal menyimpan file audio ke database browser. Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 p-5 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                <Music className="w-5 h-5 text-purple-200" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">
                  Pengaturan Audio Jadwal Hobi
                </h3>
                <p className="text-xs text-purple-200 font-medium">
                  {targetTask ? targetTask.title : 'Audio Notifikasi Bangun & Asah Skill'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                stopPreviewAudio();
                onClose();
              }}
              className="p-1.5 rounded-xl text-purple-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-3 inline-flex items-center gap-1.5 bg-purple-900/50 border border-purple-400/30 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-purple-200">
            <Sparkles className="w-3 h-3 text-purple-300" />
            <span>Khusus Jadwal Hobi: Otomatis berputar saat jam tiba & stop saat dipencet</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Error notice */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="font-medium">{errorMessage}</p>
            </div>
          )}

          {/* Section 1: Upload MP3 File */}
          <div className="border border-purple-200 rounded-2xl p-4 bg-purple-50/40">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                <FileAudio className="w-4 h-4 text-purple-700" />
                <span>1. Masukkan File Audio MP3 Anda</span>
              </label>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-full">
                Rekomendasi
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Unggah file lagu favorit, rekaman suara, atau alarm MP3 dari HP/laptop Anda.
            </p>

            {/* Hidden native input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/mp3,audio/mpeg,audio/*,.mp3"
              onChange={handleFileChange}
              className="hidden"
            />

            {customFileName ? (
              <div className="bg-white border-2 border-purple-400/60 rounded-xl p-3.5 shadow-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                    <Music className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {customFileName}
                    </p>
                    <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                      <Check className="w-3 h-3" /> File MP3 Siap Digunakan
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleTogglePlayPreview}
                    className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isPlayingPreview
                        ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {isPlayingPreview ? (
                      <>
                        <Square className="w-3 h-3 fill-current" />
                        <span>Stop</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        <span>Tes MP3</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleClearCustomFile}
                    className="min-h-[36px] p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Hapus file ini"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-purple-300 hover:border-purple-500 bg-white hover:bg-purple-50/50 rounded-xl p-5 text-center transition-all cursor-pointer group"
              >
                <Upload className="w-7 h-7 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-purple-950 block">
                  Pilih / Unggah File MP3 (.mp3)
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Klik untuk jelajahi file di perangkat Anda (Maks 25 MB)
                </span>
              </button>
            )}
          </div>

          {/* Section 2: Pilihan Audio Bawaan jika tidak ingin upload */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70">
            <label className="text-xs font-bold text-slate-800 block mb-1">
              2. Atau Pilih Nada Bawaan Hobi
            </label>
            <p className="text-[11px] text-slate-500 mb-3">
              Gunakan nada motivasi sintetis jika belum memiliki file MP3 sendiri:
            </p>

            <div className="space-y-2">
              {[
                {
                  id: 'energetic_beat',
                  title: 'Energetic Beat Motivasi',
                  desc: 'Ritmik nada cepat pemicu semangat bangun',
                },
                {
                  id: 'acoustic_melody',
                  title: 'Melodi Akustik Gitar',
                  desc: 'Akord hangat cocok untuk latihan alat musik',
                },
                {
                  id: 'lofi_wake',
                  title: 'Lo-Fi Wake-Up Groove',
                  desc: 'Santai namun berirama teratur',
                },
              ].map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => {
                    stopPreviewAudio();
                    setIsPlayingPreview(false);
                    setSelectedType(preset.id as any);
                  }}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                    selectedType === preset.id
                      ? 'bg-purple-100/70 border-purple-500 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-purple-300'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-900">{preset.title}</p>
                    <p className="text-[11px] text-slate-500 truncate">{preset.desc}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {selectedType === preset.id && (
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Option: Terapkan ke semua kegiatan hobi */}
          <div className="bg-slate-100/80 rounded-xl p-3 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Terapkan ke Semua Kegiatan Hobi
              </span>
              <span className="text-[11px] text-slate-500 block">
                Otomatis pasang audio ini ke seluruh sesi asah skill hobi Anda
              </span>
            </div>
            <input
              type="checkbox"
              checked={applyToAllHobby}
              onChange={(e) => setApplyToAllHobby(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              stopPreviewAudio();
              onClose();
            }}
            className="min-h-[44px] flex-1 py-2.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="min-h-[44px] flex-1 py-2.5 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
          >
            {isSaving ? (
              <span>Menyimpan...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Simpan Pengaturan Audio</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
