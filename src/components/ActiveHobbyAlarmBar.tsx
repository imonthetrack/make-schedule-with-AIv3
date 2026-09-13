import React, { useEffect, useState } from 'react';
import {
  subscribeHobbyAlarmState,
  stopContinuousHobbyAlarm,
  ActiveHobbyAlarmState,
} from '../utils/audio';
import { Music, Square, CheckCircle2 } from 'lucide-react';

interface ActiveHobbyAlarmBarProps {
  onMarkTaskCompleted?: (taskId: string) => void;
}

export const ActiveHobbyAlarmBar: React.FC<ActiveHobbyAlarmBarProps> = ({
  onMarkTaskCompleted,
}) => {
  const [alarmState, setAlarmState] = useState<ActiveHobbyAlarmState>({
    isPlaying: false,
    taskId: '',
    taskTitle: '',
    audioName: '',
  });

  useEffect(() => {
    const unsubscribe = subscribeHobbyAlarmState((state) => {
      setAlarmState(state);
    });
    return () => unsubscribe();
  }, []);

  if (!alarmState.isPlaying) return null;

  const handleStop = () => {
    stopContinuousHobbyAlarm();
  };

  const handleComplete = () => {
    stopContinuousHobbyAlarm();
    if (onMarkTaskCompleted && alarmState.taskId) {
      onMarkTaskCompleted(alarmState.taskId);
    }
  };

  return (
    <div
      id="active-hobby-alarm-bar"
      className="fixed bottom-4 left-4 right-4 max-w-2xl mx-auto z-50 animate-in slide-in-from-bottom-5 duration-200"
    >
      <div className="bg-slate-900 border-2 border-purple-500 rounded-2xl p-3.5 sm:p-4 text-white shadow-2xl ring-4 ring-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left info & animated equalizer */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md animate-pulse">
            <Music className="w-5 h-5 animate-bounce" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-300">
                Audio Hobi Berputar
              </span>
            </div>
            <p className="text-sm font-bold text-white truncate max-w-xs sm:max-w-sm">
              {alarmState.taskTitle || 'Jadwal Hobi Aktif'}
            </p>
            <p className="text-[11px] text-purple-200 truncate">
              {alarmState.audioName || 'Audio MP3'}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
          {/* STOP BUTTON - Crucial user request */}
          <button
            type="button"
            id="stop-hobby-audio-btn"
            onClick={handleStop}
            className="min-h-[44px] flex-1 sm:flex-none px-4 py-2.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-rose-400/50"
            title="Hentikan audio alarm sekarang"
          >
            <Square className="w-4 h-4 fill-current" />
            <span>BERHENTI</span>
          </button>

          {/* Selesai / Centang */}
          <button
            type="button"
            onClick={handleComplete}
            className="min-h-[44px] flex-1 sm:flex-none px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            title="Hentikan audio dan tandai tugas selesai"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Selesai</span>
          </button>
        </div>
      </div>
    </div>
  );
};
