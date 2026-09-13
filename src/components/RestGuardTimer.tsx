import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, BellOff, Volume2, AlertTriangle, Coffee, Plus, Sparkles } from 'lucide-react';
import { startAlarm, stopAlarm, playBeepTone, initAudioContext, cleanupAudioContext } from '../utils/audio';
import { useNotification, scheduleBackgroundTimer, cancelBackgroundTimer } from '../hooks/useNotification';

interface RestGuardTimerProps {
  onRestComplete?: () => void;
}

export const RestGuardTimer: React.FC<RestGuardTimerProps> = ({ onRestComplete }) => {
  const [initialMinutes, setInitialMinutes] = useState<number>(15);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(15 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isAlarmActive, setIsAlarmActive] = useState<boolean>(false);
  const [isTestingSound, setIsTestingSound] = useState<boolean>(false);
  const [isTestingBackground, setIsTestingBackground] = useState<boolean>(false);

  const { sendRestGuardAlarm, requestPermission, isGranted, testBackgroundAlarm5s } = useNotification();

  // 1. DRIFT-FREE PRECISION TIMER: Target timestamp reference
  const targetEndTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  // Quick preset minutes
  const minutePresets = [5, 10, 15, 20, 30];

  // Set preset
  const handleSelectPreset = (mins: number) => {
    initAudioContext();
    stopAlarm();
    cancelBackgroundTimer('rest-guard');
    setIsAlarmActive(false);
    setIsRunning(false);
    targetEndTimeRef.current = null;
    setInitialMinutes(mins);
    setRemainingSeconds(mins * 60);
  };

  // Add 1 minute
  const handleAddMinute = () => {
    initAudioContext();
    if (isRunning && targetEndTimeRef.current) {
      targetEndTimeRef.current += 60 * 1000;
      setRemainingSeconds((prev) => prev + 60);
      // Update background scheduled timer in SW
      scheduleBackgroundTimer(
        'rest-guard',
        targetEndTimeRef.current,
        '🚨 Waktu Istirahat Habis!',
        `Waktu istirahat telah selesai. Segera kembali ke sesi kegiatan berikutnya!`
      );
    } else {
      setRemainingSeconds((prev) => prev + 60);
      setInitialMinutes((prev) => prev + 1);
    }
  };

  // Dismiss Alarm
  const handleDismissAlarm = useCallback(() => {
    stopAlarm();
    cancelBackgroundTimer('rest-guard');
    setIsAlarmActive(false);
    setIsRunning(false);
    targetEndTimeRef.current = null;
    setRemainingSeconds(initialMinutes * 60);
    if (onRestComplete) {
      onRestComplete();
    }
  }, [initialMinutes, onRestComplete]);

  // Trigger when countdown reaches zero
  const handleTimerFinish = useCallback(() => {
    if (timerIntervalRef.current !== null) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    targetEndTimeRef.current = null;
    setRemainingSeconds(0);
    setIsRunning(false);
    setIsAlarmActive(true);

    // 1. Web Audio Alarm
    startAlarm();

    // 2. Background PWA & System Notification
    sendRestGuardAlarm(initialMinutes);
  }, [initialMinutes, sendRestGuardAlarm]);

  // Synchronize timer against absolute system clock
  const syncTimerToCurrentTimestamp = useCallback(() => {
    if (!targetEndTimeRef.current) return;
    const now = Date.now();
    const diffMs = targetEndTimeRef.current - now;

    if (diffMs <= 0) {
      handleTimerFinish();
    } else {
      setRemainingSeconds(Math.ceil(diffMs / 1000));
    }
  }, [handleTimerFinish]);

  // Toggle Play / Pause
  const handleTogglePlay = async () => {
    initAudioContext();

    // Auto-prompt notification permission if not granted yet
    if (!isGranted) {
      await requestPermission();
    }

    if (isAlarmActive) {
      handleDismissAlarm();
      return;
    }

    if (!isRunning) {
      playBeepTone(600, 0.1);
      const targetTime = Date.now() + remainingSeconds * 1000;
      targetEndTimeRef.current = targetTime;
      setIsRunning(true);

      // Register background timer directly in Service Worker (survives tab switch & lock screen)
      scheduleBackgroundTimer(
        'rest-guard',
        targetTime,
        '🚨 Waktu Istirahat Habis!',
        `Waktu istirahat ${initialMinutes} menit telah selesai. Segera kembali ke sesi kegiatan!`
      );
    } else {
      // Pause: calculate exact remaining from target timestamp
      if (targetEndTimeRef.current) {
        const diffSec = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));
        setRemainingSeconds(diffSec);
      }
      targetEndTimeRef.current = null;
      setIsRunning(false);
      cancelBackgroundTimer('rest-guard');
    }
  };

  // Reset timer
  const handleReset = () => {
    initAudioContext();
    stopAlarm();
    cancelBackgroundTimer('rest-guard');
    setIsAlarmActive(false);
    setIsRunning(false);
    targetEndTimeRef.current = null;
    setRemainingSeconds(initialMinutes * 60);
  };

  // Test sound
  const handleTestSound = () => {
    initAudioContext();
    if (isTestingSound) {
      stopAlarm();
      setIsTestingSound(false);
    } else {
      setIsTestingSound(true);
      startAlarm();
      setTimeout(() => {
        stopAlarm();
        setIsTestingSound(false);
      }, 2500);
    }
  };

  // Test 5s Background Pop-up (allows user to lock screen / switch tab to test)
  const handleTest5sPopUp = async () => {
    initAudioContext();
    setIsTestingBackground(true);
    await testBackgroundAlarm5s();
    setTimeout(() => {
      setIsTestingBackground(false);
    }, 6000);
  };

  // Listen to SW background timer messages
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'TIMER_EXPIRED' && event.data.timerId === 'rest-guard') {
        setIsAlarmActive(true);
        setIsRunning(false);
        setRemainingSeconds(0);
        startAlarm();
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  // Active Timer Loop (200ms tick for fluid UI + timestamp calculation)
  useEffect(() => {
    if (isRunning && targetEndTimeRef.current) {
      syncTimerToCurrentTimestamp();
      timerIntervalRef.current = window.setInterval(syncTimerToCurrentTimestamp, 200);
    }

    return () => {
      if (timerIntervalRef.current !== null) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isRunning, syncTimerToCurrentTimestamp]);

  // Instant Background Resync on Page Visibility / Tab Focus Change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning && targetEndTimeRef.current) {
        syncTimerToCurrentTimestamp();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [isRunning, syncTimerToCurrentTimestamp]);

  // Memory Leak Guard: Full cleanup on component unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current !== null) {
        clearInterval(timerIntervalRef.current);
      }
      stopAlarm();
      cleanupAudioContext();
    };
  }, []);

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progressPercent =
    initialMinutes > 0
      ? Math.max(
          0,
          Math.min(100, ((initialMinutes * 60 - remainingSeconds) / (initialMinutes * 60)) * 100)
        )
      : 0;

  return (
    <section
      id="rest-guard-section"
      className={`rounded-2xl p-4 sm:p-5 transition-all duration-300 border ${
        isAlarmActive
          ? 'bg-rose-600 text-white border-rose-700 shadow-xl'
          : 'bg-white border-slate-200/90 shadow-xs'
      }`}
    >
      {/* Alarm Notification Banner */}
      {isAlarmActive && (
        <div className="bg-rose-950/80 text-white p-3.5 rounded-xl mb-4 flex items-center justify-between border border-rose-400/40 animate-pulse">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-6 h-6 text-amber-300 shrink-0" />
            <div>
              <div className="font-black text-sm sm:text-base leading-tight">Waktu Istirahat Habis!</div>
              <div className="text-xs text-rose-200 mt-0.5">Segera kembali ke sesi kegiatan berikutnya.</div>
            </div>
          </div>
          <button
            id="dismiss-alarm-button"
            type="button"
            onClick={handleDismissAlarm}
            className="min-h-[44px] bg-white text-rose-700 font-black px-4 py-2 rounded-xl shadow hover:bg-rose-50 active:scale-95 transition-transform cursor-pointer"
          >
            Matikan
          </button>
        </div>
      )}

      {/* Header Info */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`p-2 rounded-xl ${
              isAlarmActive ? 'bg-white text-rose-600' : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            <Coffee className="w-4 h-4" />
          </div>
          <div>
            <h2 className={`text-sm sm:text-base font-bold ${isAlarmActive ? 'text-white' : 'text-slate-900'}`}>
              Rest Guard Timer
            </h2>
            <p className={`text-xs ${isAlarmActive ? 'text-rose-100' : 'text-slate-500'}`}>
              Pop-up latar belakang & lock screen
            </p>
          </div>
        </div>

        {/* Action Buttons: Test Sound & Test Background Pop-up */}
        <div className="flex items-center gap-1.5">
          <button
            id="test-sound-btn"
            type="button"
            onClick={handleTestSound}
            className={`min-h-[34px] text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors active:scale-95 cursor-pointer ${
              isTestingSound
                ? 'bg-amber-400 text-slate-900 font-bold'
                : isAlarmActive
                ? 'bg-rose-700 text-white hover:bg-rose-800'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title="Tes Suara Alarm Web Audio"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isTestingSound ? 'Alarm...' : 'Tes Suara'}</span>
          </button>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-3.5 no-scrollbar">
        {minutePresets.map((mins) => {
          const isSelected = initialMinutes === mins;
          return (
            <button
              key={mins}
              type="button"
              onClick={() => handleSelectPreset(mins)}
              className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? isAlarmActive
                    ? 'bg-white text-rose-700 font-extrabold shadow-sm'
                    : 'bg-emerald-600 text-white shadow-xs'
                  : isAlarmActive
                  ? 'bg-rose-700 text-rose-100 hover:bg-rose-800'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {mins}m
            </button>
          );
        })}
        <button
          type="button"
          onClick={handleAddMinute}
          className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 whitespace-nowrap cursor-pointer ${
            isAlarmActive
              ? 'bg-rose-700 text-rose-100'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
          title="Tambah 1 menit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>1m</span>
        </button>
      </div>

      {/* Big Digital Display */}
      <div
        className={`rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center transition-all ${
          isAlarmActive
            ? 'bg-rose-700/80 border border-rose-500'
            : 'bg-slate-900 text-white shadow-inner'
        }`}
      >
        <div className="font-mono text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-xs">
          {formatTime(remainingSeconds)}
        </div>
        <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
            }`}
          />
          <span className="text-slate-300">
            {isRunning
              ? 'Timer Berjalan (Pop-up SW Aktif)'
              : remainingSeconds === 0
              ? 'Alarm Berbunyi'
              : 'Siap Dimulai'}
          </span>
        </div>

        {/* Progress Bar inside timer */}
        <div className="w-full max-w-xs bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
          <div
            className="bg-emerald-400 h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Primary Action Controls (Touch targets min 44px) */}
      <div className="flex items-center gap-2.5 mt-3.5">
        <button
          id="toggle-timer-button"
          type="button"
          onClick={handleTogglePlay}
          className={`flex-1 min-h-[48px] py-2.5 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-all cursor-pointer ${
            isAlarmActive
              ? 'bg-white text-rose-700 hover:bg-rose-50'
              : isRunning
              ? 'bg-amber-500 hover:bg-amber-600 text-white'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          {isAlarmActive ? (
            <>
              <BellOff className="w-5 h-5" />
              <span>Matikan Alarm</span>
            </>
          ) : isRunning ? (
            <>
              <Pause className="w-5 h-5" />
              <span>Jeda Istirahat</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>Mulai Istirahat ({initialMinutes}m)</span>
            </>
          )}
        </button>

        <button
          id="reset-timer-button"
          type="button"
          onClick={handleReset}
          className={`min-h-[48px] min-w-[48px] p-3 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
            isAlarmActive
              ? 'bg-rose-700 border-rose-500 text-white hover:bg-rose-800'
              : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
          }`}
          title="Reset Timer"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* 5-Second Background Pop-Up Tester for Lock Screen & Other Tabs */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          id="test-5s-popup-btn"
          type="button"
          onClick={handleTest5sPopUp}
          className={`w-full min-h-[38px] flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
            isTestingBackground
              ? 'bg-amber-50 border-amber-300 text-amber-800 animate-pulse'
              : isAlarmActive
              ? 'bg-rose-700/50 border-rose-400/30 text-rose-100 hover:bg-rose-700'
              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
          }`}
          title="Uji coba pop-up banner saat Anda membuka tab lain atau mengunci layar"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>
            {isTestingBackground
              ? '⏳ Hitung mundur 5d... Beralih ke tab lain sekarang!'
              : '⚡ Uji Pop-up Latar Belakang / Lock Screen (5 Detik)'}
          </span>
        </button>
      </div>
    </section>
  );
};
