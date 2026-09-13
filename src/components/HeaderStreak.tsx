import React, { useState, memo } from 'react';
import { StreakData, ScheduleItem } from '../types';
import { Flame, CheckCircle2, Clock, CalendarDays, Bell, BellRing, Volume2, Sparkles, Share2 } from 'lucide-react';
import { useNotification } from '../hooks/useNotification';
import { playScheduleAlertChime, initAudioContext } from '../utils/audio';

interface HeaderStreakProps {
  streak: StreakData;
  items: ScheduleItem[];
  currentTime: string;
  onOpenShare?: () => void;
}

export const HeaderStreak: React.FC<HeaderStreakProps> = memo(({
  streak,
  items,
  currentTime,
  onOpenShare,
}) => {
  const { isGranted, isSupported, requestPermission, testBackgroundAlarm5s } = useNotification();
  const [isPlayingChime, setIsPlayingChime] = useState<boolean>(false);
  const [isTestingBg, setIsTestingBg] = useState<boolean>(false);

  const handleRequestPermission = async () => {
    initAudioContext();
    await requestPermission();
  };

  const handleTestChime = () => {
    initAudioContext();
    setIsPlayingChime(true);
    playScheduleAlertChime();
    setTimeout(() => {
      setIsPlayingChime(false);
    }, 2500);
  };

  const handleTest5sPopUp = async () => {
    initAudioContext();
    setIsTestingBg(true);
    await testBackgroundAlarm5s();
    setTimeout(() => {
      setIsTestingBg(false);
    }, 6000);
  };

  const completedCount = items.filter((i) => i.completed).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const today = new Date();
  const dateFormatted = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(today);

  return (
    <header
      id="main-header-streak"
      className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-800"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium flex-wrap">
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
              <span className="capitalize">{dateFormatted}</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-mono text-amber-400 font-bold bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
              <Clock className="w-3.5 h-3.5" />
              {currentTime} WIB
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1.5 flex items-center gap-2">
            <span>Jadwal Kilat</span>
            <span className="text-[11px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
              PWA & Precision
            </span>
          </h1>
        </div>

        {/* Action Badges: Notification Toggle & Streak Card */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Notification Permission & Test Chime Toggle */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 p-1.5 rounded-xl flex-wrap sm:flex-nowrap">
            {isSupported && !isGranted ? (
              <button
                id="enable-notif-btn"
                type="button"
                onClick={handleRequestPermission}
                className="min-h-[36px] flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                title="Aktifkan notifikasi pop-up OS saat waktu kegiatan tiba"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Aktifkan Notif</span>
              </button>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 px-2 py-1">
                <BellRing className="w-3.5 h-3.5" />
                <span>Notif OS Aktif</span>
              </span>
            )}

            {/* Test 5s Pop-up Button for Lock Screen / Other Tabs */}
            <button
              id="test-os-popup-btn"
              type="button"
              onClick={handleTest5sPopUp}
              className={`min-h-[36px] flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                isTestingBg
                  ? 'bg-amber-400 text-slate-950 font-bold animate-pulse'
                  : 'bg-slate-700/80 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-amber-500/30'
              }`}
              title="Klik, lalu buka tab lain atau kunci layar untuk menguji banner pop-up OS dalam 5 detik"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{isTestingBg ? 'Tutup tab ini! (5d)' : 'Tes Pop-up OS (5d)'}</span>
            </button>

            <button
              id="test-chime-btn"
              type="button"
              onClick={handleTestChime}
              className={`min-h-[36px] flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                isPlayingChime
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Uji coba nada lonceng Schedule Alert (Web Audio)"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isPlayingChime ? 'Berbunyi...' : 'Chime'}</span>
            </button>
          </div>

          {/* Share Project Button for Judges & Public */}
          {onOpenShare && (
            <button
              id="share-project-btn"
              type="button"
              onClick={onOpenShare}
              className="min-h-[40px] flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border border-blue-400/40 text-xs font-bold py-2 px-3 rounded-xl shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
              title="Bagikan Tautan Proyek Lomba (Siap Dinilai oleh Siapa Saja)"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-300" />
              <span>Bagi Link Lomba</span>
            </button>
          )}

          {/* Streak Motivation Card */}
          <div
            id="streak-motivation-badge"
            className="flex items-center gap-2.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-orange-500/40 px-3.5 py-2 rounded-xl shadow-xs shrink-0"
          >
            <div className="bg-orange-500 text-white p-1.5 rounded-xl shadow-xs">
              <Flame className="w-4 h-4 sm:w-5 sm:h-5 fill-white animate-pulse" />
            </div>
            <div className="text-right">
              <div className="text-base sm:text-xl font-black text-amber-300 leading-tight">
                {streak.currentStreak} <span className="text-xs font-bold text-amber-200">Hari</span>
              </div>
              <div className="text-[9px] sm:text-[10px] text-orange-200 font-semibold uppercase tracking-wider">
                Streak Aktif 🔥
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar & Counter */}
      <div className="mt-3.5 pt-3 border-t border-slate-800/90 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Target Hari Ini: <strong className="text-white font-bold">{completedCount}</strong> dari {totalCount} selesai
          </span>
        </div>
        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-0.5 rounded-md">
          {progressPercent}%
        </span>
      </div>

      <div className="w-full bg-slate-800 h-2 rounded-full mt-2.5 overflow-hidden">
        <div
          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </header>
  );
});

HeaderStreak.displayName = 'HeaderStreak';
