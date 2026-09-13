import React, { memo } from 'react';
import { PRESET_TEMPLATES } from '../presets';
import { PresetTemplate } from '../types';
import {
  Sparkles,
  RotateCcw,
  Check,
  Trash2,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Zap,
  Music,
  GraduationCap,
  SunMedium,
  Info,
} from 'lucide-react';
import { initAudioContext, playShiftSound } from '../utils/audio';

interface PresetSelectorProps {
  onSelectPreset: (preset: PresetTemplate) => void;
  activePresetId?: string;
  onResetDefault: () => void;
  onClearCompleted: () => void;
  hasCompletedItems: boolean;
  isWeekdayHoliday: boolean;
  onToggleWeekdayHoliday: () => void;
  onOpenStudyTools: () => void;
}

export const PresetSelector: React.FC<PresetSelectorProps> = memo(({
  onSelectPreset,
  activePresetId,
  onResetDefault,
  onClearCompleted,
  hasCompletedItems,
  isWeekdayHoliday,
  onToggleWeekdayHoliday,
  onOpenStudyTools,
}) => {
  const dayOfWeek = new Date().getDay(); // 0: Sunday, 6: Saturday
  const isWeekendNow = dayOfWeek === 0 || dayOfWeek === 6;

  const handlePresetClick = (preset: PresetTemplate) => {
    initAudioContext();
    playShiftSound();

    if (preset.id === 'fokus_cepat') {
      // Open dedicated Study Tools Engine modal as requested
      onOpenStudyTools();
      return;
    }

    onSelectPreset(preset);
  };

  return (
    <section
      id="preset-selector-section"
      className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/90"
    >
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              4 Karakter Jadwal & Tools
            </h2>
            <p className="text-xs text-slate-500">
              Pilih karakter aktivitas harian atau buka alat bantu belajar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-center">
          {hasCompletedItems && (
            <button
              id="clear-completed-btn"
              type="button"
              onClick={onClearCompleted}
              className="text-[11px] text-slate-500 hover:text-rose-600 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-slate-100 flex items-center gap-1 transition-colors cursor-pointer"
              title="Bersihkan kegiatan yang sudah selesai"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bersihkan Selesai</span>
            </button>
          )}

          <button
            id="reset-default-btn"
            type="button"
            onClick={onResetDefault}
            className="text-[11px] text-slate-500 hover:text-blue-600 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-slate-100 flex items-center gap-1 transition-colors cursor-pointer"
            title="Kembalikan ke template awal"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Holiday / Workday Switcher Banner */}
      <div className="mb-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-slate-800">
              Hari ini:{' '}
              {isWeekendNow
                ? 'Akhir Pekan (Sabtu/Minggu)'
                : 'Hari Kerja (Senin–Jumat)'}
            </span>
            <span className="text-slate-500 ml-1.5 block sm:inline text-[11px]">
              {isWeekendNow
                ? '• Mode Weekend aktif otomatis'
                : isWeekdayHoliday
                ? '• Libur Nasional aktif (Mode Weekend)'
                : '• Mode Sekolah aktif'}
            </span>
          </div>
        </div>

        {/* Toggle switch for weekday holidays */}
        {!isWeekendNow && (
          <button
            type="button"
            onClick={onToggleWeekdayHoliday}
            className={`min-h-[36px] flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              isWeekdayHoliday
                ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border-slate-300 hover:border-slate-400'
            }`}
            title="Jika hari ini tanggal merah/libur di hari kerja, alihkan jadwal sekolah ke weekend"
          >
            {isWeekdayHoliday ? (
              <ToggleRight className="w-4 h-4 text-amber-700" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-slate-400" />
            )}
            <span>{isWeekdayHoliday ? '🏖️ Libur Kerja Aktif' : 'Hari Kerja Libur?'}</span>
          </button>
        )}
      </div>

      {/* 4 Characteristic Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2.5">
        {PRESET_TEMPLATES.map((preset) => {
          const isActive = activePresetId === preset.id;
          const isTool = preset.categoryType === 'tool';
          const isSekolahDisabled =
            preset.id === 'sekolah' && (isWeekendNow || isWeekdayHoliday);

          return (
            <button
              key={preset.id}
              id={`preset-btn-${preset.id}`}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className={`min-h-[82px] flex flex-col justify-between p-3.5 rounded-2xl border text-left transition-all duration-150 relative active:scale-[0.98] cursor-pointer ${
                isTool
                  ? 'bg-gradient-to-br from-amber-50 to-orange-50/80 hover:from-amber-100 hover:to-orange-100 border-amber-300 ring-1 ring-amber-400/30 shadow-xs'
                  : isActive
                  ? 'bg-blue-50/90 border-blue-500 shadow-xs ring-2 ring-blue-500/20'
                  : 'bg-slate-50/90 hover:bg-slate-100 border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between w-full mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl" role="img" aria-label={preset.name}>
                    {preset.icon}
                  </span>
                  <div>
                    <span className="text-xs sm:text-sm font-black text-slate-900 leading-tight block">
                      {preset.name}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 block">
                      {preset.id === 'sekolah'
                        ? 'Prioritas Tugas & Belajar'
                        : preset.id === 'weekend'
                        ? 'Agenda Libur Anti-Rebahan'
                        : preset.id === 'hobby'
                        ? 'Skill Baru + Notif Motivasi'
                        : 'Pomodoro, Feynman & OSN'}
                    </span>
                  </div>
                </div>

                {isTool ? (
                  <span className="flex items-center gap-1 text-[10px] font-extrabold bg-amber-500 text-white px-2 py-0.5 rounded-full shadow-2xs">
                    <Zap className="w-2.5 h-2.5 fill-white" />
                    <span>BUKA TOOLS</span>
                  </span>
                ) : isActive ? (
                  <span className="flex items-center justify-center w-5 h-5 bg-blue-600 text-white rounded-full shadow-2xs">
                    <Check className="w-3 h-3" />
                  </span>
                ) : isSekolahDisabled ? (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                    Dialihkan Libur
                  </span>
                ) : null}
              </div>

              <div className="w-full flex items-center justify-between text-[11px] text-slate-500 mt-1 pt-1.5 border-t border-slate-200/60">
                <p className="truncate max-w-[210px] sm:max-w-[180px]">
                  {preset.description}
                </p>
                <span className="font-bold text-slate-700 shrink-0 ml-1">
                  {isTool ? '3 Teknik' : `${preset.items.length} Sesi`}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
});

PresetSelector.displayName = 'PresetSelector';

