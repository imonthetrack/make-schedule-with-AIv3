import React, { memo } from 'react';
import { FastForward, Rewind, Clock, Zap } from 'lucide-react';
import { initAudioContext, playShiftSound } from '../utils/audio';

interface ShiftControlsProps {
  onShiftAll: (deltaMinutes: number, label: string) => void;
  onAlignToNow: () => void;
}

export const ShiftControls: React.FC<ShiftControlsProps> = memo(({
  onShiftAll,
  onAlignToNow,
}) => {
  const handleShift = (mins: number, label: string) => {
    initAudioContext();
    playShiftSound();
    onShiftAll(mins, label);
  };

  const handleAlign = () => {
    initAudioContext();
    playShiftSound();
    onAlignToNow();
  };

  return (
    <section
      id="shift-controls-section"
      className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-slate-50 border border-amber-200/80 rounded-2xl p-4 shadow-xs"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
              <span>Shift Waktu</span>
              <span className="text-[10px] text-amber-800 bg-amber-100 border border-amber-300 font-semibold px-2 py-0.5 rounded-full">
                Anti-Gagal
              </span>
            </h2>
            <p className="text-xs text-slate-600">
              Mager / telat? Geser semua jam kegiatan otomatis
            </p>
          </div>
        </div>
      </div>

      {/* Button Action Bar with minimum 44px touch targets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
        <button
          id="shift-plus-15-btn"
          type="button"
          onClick={() => handleShift(15, '+15 Menit')}
          className="min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 px-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <FastForward className="w-4 h-4" />
          <span>+15 Menit</span>
        </button>

        <button
          id="shift-plus-30-btn"
          type="button"
          onClick={() => handleShift(30, '+30 Menit')}
          className="min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 px-3 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <FastForward className="w-4 h-4" />
          <span>+30 Menit</span>
        </button>

        <button
          id="shift-minus-15-btn"
          type="button"
          onClick={() => handleShift(-15, '-15 Menit')}
          className="min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white hover:bg-slate-100 active:scale-95 text-slate-700 border border-slate-300 font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <Rewind className="w-4 h-4 text-slate-500" />
          <span>-15 Menit</span>
        </button>

        <button
          id="align-now-btn"
          type="button"
          onClick={handleAlign}
          className="min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 border border-indigo-200 font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer"
          title="Mulai jadwal pertama dari jam saat ini"
        >
          <Clock className="w-4 h-4 text-indigo-600" />
          <span>Mulai Sekarang</span>
        </button>
      </div>
    </section>
  );
});

ShiftControls.displayName = 'ShiftControls';
