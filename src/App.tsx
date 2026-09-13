/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ScheduleItem, StreakData, PresetTemplate } from './types';
import {
  loadSchedule,
  saveSchedule,
  loadStreak,
  saveStreak,
  shiftTime,
  calculateUpdatedStreak,
  getCurrentTimeHHMM,
  getDefaultSchedule,
  clearCompletedSchedule,
} from './utils/storage';
import {
  playScheduleAlertChime,
  playMotivationalWakeupChime,
  initAudioContext,
  startContinuousHobbyAlarm,
  stopContinuousHobbyAlarm,
} from './utils/audio';
import { getHobbyAudio, GLOBAL_HOBBY_AUDIO_KEY } from './utils/hobbyAudioStorage';
import { PRESET_TEMPLATES } from './presets';
import { useNotification, syncBackgroundTasks, isIframeEnvironment } from './hooks/useNotification';
import { HeaderStreak } from './components/HeaderStreak';
import { PresetSelector } from './components/PresetSelector';
import { ShiftControls } from './components/ShiftControls';
import { TaskList } from './components/TaskList';
import { RestGuardTimer } from './components/RestGuardTimer';
import { AddTaskModal } from './components/AddTaskModal';
import { UrgentAlertModal } from './components/UrgentAlertModal';
import { AiAssistantModal } from './components/AiAssistantModal';
import { StudyToolsModal } from './components/StudyToolsModal';
import { ActiveHobbyAlarmBar } from './components/ActiveHobbyAlarmBar';
import { HobbyAudioSettingsModal } from './components/HobbyAudioSettingsModal';
import { ShareModal } from './components/ShareModal';
import { Toast } from './components/Toast';
import { ExternalLink, ShieldAlert, X, Sparkles, Share2 } from 'lucide-react';

export default function App() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>(() => loadSchedule());
  const [streak, setStreak] = useState<StreakData>(() => loadStreak());
  const [activePresetId, setActivePresetId] = useState<string>('sekolah');
  const [isWeekdayHoliday, setIsWeekdayHoliday] = useState<boolean>(() => {
    try {
      return localStorage.getItem('isWeekdayHoliday') === 'true';
    } catch {
      return false;
    }
  });
  const [isStudyToolsOpen, setIsStudyToolsOpen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>(() => getCurrentTimeHHMM());
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [urgentModalTask, setUrgentModalTask] = useState<ScheduleItem | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [aiModalMode, setAiModalMode] = useState<'micro_step' | 'dynamic_evaluator'>('micro_step');
  const [aiActiveTask, setAiActiveTask] = useState<ScheduleItem | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'shift' | 'success' | 'info'>('shift');
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [currentAlertingTaskId, setCurrentAlertingTaskId] = useState<string | null>(null);
  const [showIframeNotice, setShowIframeNotice] = useState<boolean>(() => isIframeEnvironment());
  const [hobbyAudioModalTask, setHobbyAudioModalTask] = useState<ScheduleItem | null>(null);
  const [isHobbyAudioModalOpen, setIsHobbyAudioModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  const { sendScheduleAlert } = useNotification();

  // Track task alert keys triggered today to prevent duplicate triggers in the same minute
  const alertedKeysRef = useRef<Set<string>>(new Set());

  const showToast = useCallback((msg: string, type: 'shift' | 'success' | 'info' = 'shift') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  const handleOpenHobbyAudioSettings = useCallback((task: ScheduleItem) => {
    setHobbyAudioModalTask(task);
    setIsHobbyAudioModalOpen(true);
  }, []);

  const handleSaveHobbyAudio = useCallback(
    (
      taskId: string,
      audioType: 'custom_mp3' | 'energetic_beat' | 'acoustic_melody' | 'lofi_wake',
      audioName: string,
      blobKey?: string
    ) => {
      setSchedule((prev) =>
        prev.map((item) => {
          if (item.id === taskId) {
            return {
              ...item,
              hobbyAudioType: audioType,
              hobbyAudioName: audioName,
              hobbyAudioBlobKey: blobKey || item.hobbyAudioBlobKey,
            };
          }
          return item;
        })
      );
      showToast(`🎵 Audio hobi "${audioName}" berhasil disimpan!`, 'success');
    },
    [showToast]
  );

  // Shift single task and downstream tasks
  const handleShiftSingleTask = useCallback((id: string, deltaMinutes: number) => {
    setHighlightedTaskId(id);
    setTimeout(() => setHighlightedTaskId(null), 1200);

    setSchedule((prev) => {
      const targetIndex = prev.findIndex((item) => item.id === id);
      if (targetIndex === -1) return prev;

      return prev.map((item, idx) => {
        if (idx >= targetIndex) {
          return {
            ...item,
            time: shiftTime(item.time, deltaMinutes),
          };
        }
        return item;
      });
    });
    showToast('Jadwal baris ini & setelahnya bergeser +15m', 'shift');
  }, [showToast]);

  // Toggle complete task
  const handleToggleComplete = useCallback((id: string) => {
    setSchedule((prev) => {
      const updatedSchedule = prev.map((item) => {
        if (item.id === id) {
          const nextCompleted = !item.completed;
          return {
            ...item,
            completed: nextCompleted,
            completedAt: nextCompleted ? new Date().toISOString() : undefined,
          };
        }
        return item;
      });

      setStreak((prevStreak) => calculateUpdatedStreak(prevStreak, updatedSchedule));
      return updatedSchedule;
    });
  }, []);

  // Listen to Service Worker messages (Action buttons like Snooze, Clicks)
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data || {};
      if (type === 'SNOOZE_TASK_15M' && data?.taskId) {
        handleShiftSingleTask(data.taskId, 15);
      } else if (type === 'TASK_ALERT_TRIGGERED' && event.data.task) {
        setUrgentModalTask(event.data.task);
      } else if (type === 'NOTIFICATION_CLICKED') {
        const found = schedule.find((s) => !s.completed);
        if (found) setUrgentModalTask(found);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [handleShiftSingleTask, schedule]);

  // Live time ticker & Schedule Alert Evaluator (every 3 seconds)
  useEffect(() => {
    const checkScheduleAlerts = () => {
      const nowStr = getCurrentTimeHHMM();
      setCurrentTime(nowStr);

      // Check for uncompleted tasks starting right now
      schedule.forEach((task) => {
        if (!task.completed && task.time === nowStr) {
          const alertKey = `${task.id}-${nowStr}`;
          if (!alertedKeysRef.current.has(alertKey)) {
            alertedKeysRef.current.add(alertKey);

            // 1. Audio Alert: Continuous alarm for Hobby (MP3/melody loops until user clicks Berhenti), or chime for others
            if (task.category === 'music') {
              (async () => {
                let audioUrl: string | null = null;
                let audioName = task.hobbyAudioName || 'Audio Motivasi Hobi';
                const blobKey = task.hobbyAudioBlobKey || task.id;
                let stored = await getHobbyAudio(blobKey);
                if (!stored) {
                  stored = await getHobbyAudio(GLOBAL_HOBBY_AUDIO_KEY);
                }
                if (stored) {
                  audioUrl = URL.createObjectURL(stored.blob);
                  audioName = stored.fileName;
                }
                startContinuousHobbyAlarm({
                  taskId: task.id,
                  title: task.title,
                  audioUrl,
                  audioType: task.hobbyAudioType || 'energetic_beat',
                  audioName,
                });
              })();
            } else if (task.motivationAudioTone) {
              playMotivationalWakeupChime(task.motivationAudioTone);
            } else {
              playScheduleAlertChime();
            }

            // 2. Background PWA & Rich System Notification with Large Banner
            sendScheduleAlert(task.title, task.time);

            // 3. Visual Highlight, Toast & Urgent In-App Banner
            setCurrentAlertingTaskId(task.id);
            setUrgentModalTask(task);
            showToast(`🚨 Waktunya ${task.title}! (${task.time})`, 'shift');

            // Auto-clear alert active state after 60s
            setTimeout(() => {
              setCurrentAlertingTaskId((prev) => (prev === task.id ? null : prev));
            }, 60000);
          }
        }
      });
    };

    checkScheduleAlerts();
    const interval = setInterval(checkScheduleAlerts, 3000);
    return () => clearInterval(interval);
  }, [schedule, sendScheduleAlert, showToast]);

  // Save schedule on change & Sync background tasks with Service Worker
  useEffect(() => {
    saveSchedule(schedule);
    syncBackgroundTasks(schedule);
  }, [schedule]);

  // Save streak on change
  useEffect(() => {
    saveStreak(streak);
  }, [streak]);

  // 1-Click Preset Selection
  const handleSelectPreset = useCallback((preset: PresetTemplate) => {
    setActivePresetId(preset.id);

    // If this is a tool-based preset (e.g. Fokus Cepat), launch the tools modal
    if (preset.categoryType === 'tool' || preset.id === 'fokus_cepat') {
      setIsStudyToolsOpen(true);
      showToast(`Tools Belajar Cepat & Efisien dibuka!`, 'success');
      return;
    }

    const newItems: ScheduleItem[] = preset.items.map((item, idx) => ({
      id: `item-${preset.id}-${Date.now()}-${idx}`,
      ...item,
      completed: false,
    }));
    setSchedule(newItems);
    showToast(`Template "${preset.name}" aktif!`, 'success');
  }, [showToast]);

  // Toggle Weekday Holiday Switcher (Switching between Sekolah and Weekend)
  const handleToggleWeekdayHoliday = useCallback(() => {
    setIsWeekdayHoliday((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('isWeekdayHoliday', String(next));
      } catch (e) {
        // ignore storage quota
      }

      if (next) {
        // Switch to weekend schedule on weekday holiday
        const weekendPreset = PRESET_TEMPLATES.find((p) => p.id === 'weekend');
        if (weekendPreset) {
          handleSelectPreset(weekendPreset);
        }
        showToast('Mode Hari Libur Aktif: Jadwal dialihkan ke Weekend 🎉', 'info');
      } else {
        // Switch back to school schedule
        const sekolahPreset = PRESET_TEMPLATES.find((p) => p.id === 'sekolah');
        if (sekolahPreset) {
          handleSelectPreset(sekolahPreset);
        }
        showToast('Kembali ke Jadwal Tugas Sekolah 📚', 'info');
      }

      return next;
    });
  }, [handleSelectPreset, showToast]);

  // Reset to default preset
  const handleResetDefault = useCallback(() => {
    if (window.confirm('Reset jadwal ke template awal?')) {
      const defaultItems = getDefaultSchedule();
      setSchedule(defaultItems);
      setActivePresetId('sekolah');
      showToast('Jadwal di-reset ke template awal', 'info');
    }
  }, [showToast]);

  // Clear completed tasks
  const handleClearCompleted = useCallback(() => {
    setSchedule((prev) => {
      const uncompleted = clearCompletedSchedule(prev);
      return uncompleted;
    });
    showToast('Kegiatan selesai telah dibersihkan', 'info');
  }, [showToast]);

  // Shift all tasks by deltaMinutes
  const handleShiftAll = useCallback((deltaMinutes: number, label: string) => {
    setSchedule((prev) => {
      if (prev.length === 0) return prev;
      return prev.map((item) => ({
        ...item,
        time: shiftTime(item.time, deltaMinutes),
      }));
    });
    showToast(`Semua jadwal bergeser ${label}`, 'shift');
  }, [showToast]);

  // Align earliest uncompleted task to current time
  const handleAlignToNow = useCallback(() => {
    setSchedule((prev) => {
      if (prev.length === 0) return prev;
      const nowStr = getCurrentTimeHHMM();
      const firstTask = prev.find((s) => !s.completed) || prev[0];

      const [nowH, nowM] = nowStr.split(':').map(Number);
      const [taskH, taskM] = firstTask.time.split(':').map(Number);
      const diffMinutes = nowH * 60 + nowM - (taskH * 60 + taskM);

      return prev.map((item) => ({
        ...item,
        time: shiftTime(item.time, diffMinutes),
      }));
    });
    showToast(`Jadwal disesuaikan mulai jam saat ini`, 'shift');
  }, [showToast]);

  // Update task time & title
  const handleUpdateTask = useCallback((id: string, newTime: string, newTitle: string) => {
    setSchedule((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, time: newTime, title: newTitle } : item
      )
    );
    showToast('Jadwal berhasil diperbarui', 'success');
  }, [showToast]);

  // Delete task
  const handleDeleteTask = useCallback((id: string) => {
    setSchedule((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      setStreak((prevStreak) => calculateUpdatedStreak(prevStreak, updated));
      return updated;
    });
    showToast('Jadwal dihapus', 'info');
  }, [showToast]);

  // Add new task
  const handleAddTask = useCallback((newTask: Omit<ScheduleItem, 'id' | 'completed'>) => {
    const newItem: ScheduleItem = {
      id: `custom-${Date.now()}`,
      ...newTask,
      completed: false,
    };
    setSchedule((prev) => {
      const updated = [...prev, newItem].sort((a, b) => a.time.localeCompare(b.time));
      return updated;
    });
    showToast(`"${newTask.title}" ditambahkan`, 'success');
  }, [showToast]);

  // AI Assistant trigger & apply handlers
  const handleOpenAiCompanion = useCallback((mode: 'micro_step' | 'dynamic_evaluator' = 'micro_step', task?: ScheduleItem) => {
    setAiModalMode(mode);
    setAiActiveTask(task || schedule.find((s) => !s.completed) || schedule[0]);
    setIsAiModalOpen(true);
  }, [schedule]);

  const handleApplyMicroStep = useCallback((taskId: string, microStepText: string) => {
    setSchedule((prev) =>
      prev.map((item) => (item.id === taskId ? { ...item, microStep: microStepText } : item))
    );
    showToast('Langkah mikro disimpan ke jadwal', 'success');
  }, [showToast]);

  const handleApplyReschedule = useCallback((taskId: string, minutes: number) => {
    handleShiftSingleTask(taskId, minutes);
    showToast(`Jadwal diatur ulang +${minutes} menit`, 'shift');
  }, [handleShiftSingleTask, showToast]);

  const handleOpenInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  const hasCompletedItems = schedule.some((s) => s.completed);

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 antialiased selection:bg-amber-200">
      {/* Persistent Sticky Continuous Hobby Alarm Bar (stops when user clicks BERHENTI) */}
      <ActiveHobbyAlarmBar onCompleteTask={handleToggleComplete} />

      {/* Top Banner: Inform user if in Iframe to ensure OS popups work on Lock Screen & background */}
      {showIframeNotice && (
        <div className="bg-amber-50 border-b border-amber-200 px-3 sm:px-6 py-2.5 text-xs text-amber-900 flex items-center justify-between gap-3 sticky top-0 z-40 shadow-xs">
          <div className="flex items-center gap-2 max-w-3xl">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Tips Notifikasi Lock Screen / Tab Lain:</strong> Peramban membatasi pop-up OS di dalam bingkai preview. Buka di Tab Baru agar alarm dapat menembus Lock Screen & Background secara penuh.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
            >
              <span>Buka di Tab Baru</span>
              <ExternalLink className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setShowIframeNotice(false)}
              className="text-amber-700 hover:text-amber-950 p-1 rounded-md"
              title="Tutup pemberitahuan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Bento Layout: Laptop/Landscape 2-column, Tablet roomy grid, Mobile 1-column */}
      <main className="w-full max-w-2xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-6 md:px-8 py-3.5 sm:py-6 pb-20 lg:pb-8">
        <div className="flex flex-col lg:flex-row items-start gap-4 lg:gap-6">
          {/* LEFT COLUMN: Controls & Rest Guard */}
          <aside className="w-full lg:w-[380px] xl:w-[420px] shrink-0 space-y-4 lg:sticky lg:top-6 order-2 lg:order-1">
            {/* 1. Fast Preset Input */}
            <PresetSelector
              onSelectPreset={handleSelectPreset}
              activePresetId={activePresetId}
              onResetDefault={handleResetDefault}
              onClearCompleted={handleClearCompleted}
              hasCompletedItems={hasCompletedItems}
              isWeekdayHoliday={isWeekdayHoliday}
              onToggleWeekdayHoliday={handleToggleWeekdayHoliday}
              onOpenStudyTools={() => setIsStudyToolsOpen(true)}
            />

            {/* 2. Shift Controls */}
            <ShiftControls
              onShiftAll={handleShiftAll}
              onAlignToNow={handleAlignToNow}
            />

            {/* 3. Rest Guard Timer */}
            <RestGuardTimer />

            {/* 4. AI Companion Quick Card */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/80 rounded-2xl p-4 border border-amber-200/90 shadow-2xs">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-500 text-white rounded-lg shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Rest Guard AI</h3>
                    <p className="text-[11px] text-amber-900 font-medium">Anti-Malas & Evaluasi Dinamis</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                Pecah tugas berat menjadi aksi fisik pertama mikroskopis atau curhat saat buntu/menunda.
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenAiCompanion('micro_step')}
                  className="min-h-[40px] bg-white hover:bg-amber-100/60 text-slate-800 border border-amber-300 text-xs font-bold py-2 px-2.5 rounded-xl shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <span className="text-amber-600 font-black">⚡</span>
                  <span>Micro-Step</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenAiCompanion('dynamic_evaluator')}
                  className="min-h-[40px] bg-white hover:bg-rose-50 text-slate-800 border border-rose-300 text-xs font-bold py-2 px-2.5 rounded-xl shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <span className="text-rose-600 font-black">🤝</span>
                  <span>Evaluasi Mager</span>
                </button>
              </div>
            </div>

            {/* Offline-First LocalStorage & PWA Badge */}
            <div className="hidden lg:block bg-white/80 rounded-xl p-3.5 border border-slate-200 text-xs text-slate-500 space-y-0.5 text-center shadow-2xs">
              <p className="font-semibold text-slate-800">⚡ PWA & Background Service Worker Ready (Rp0)</p>
              <p className="text-[11px] text-slate-400">Offline-first • SW Scheduled Alarm • Drift-free Lock Screen Pop-up</p>
            </div>
          </aside>

          {/* RIGHT COLUMN: Header Streak & Task List */}
          <section className="w-full flex-1 space-y-4 min-w-0 order-1 lg:order-2">
            {/* Header & Streak Counter */}
            <HeaderStreak
              streak={streak}
              items={schedule}
              currentTime={currentTime}
              onOpenShare={() => setIsShareModalOpen(true)}
            />

            {/* Task List */}
            <TaskList
              items={schedule}
              currentTime={currentTime}
              onToggleComplete={handleToggleComplete}
              onShiftSingleTask={handleShiftSingleTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onAddNewTask={() => setIsAddModalOpen(true)}
              highlightedTaskId={highlightedTaskId}
              currentAlertingTaskId={currentAlertingTaskId}
              onOpenAiCompanion={handleOpenAiCompanion}
              onOpenHobbyAudioSettings={handleOpenHobbyAudioSettings}
            />

            {/* Mobile/Tablet Footer */}
            <footer className="lg:hidden text-center pt-2 pb-6 text-xs text-slate-400 space-y-1">
              <p className="font-medium">💾 Data tersimpan otomatis di LocalStorage & IndexedDB (Rp0)</p>
              <p className="text-[11px] text-slate-400">Jadwal Kilat Precision Engine • Siap Akses di Semua Perangkat</p>
            </footer>
          </section>
        </div>
      </main>

      {/* Floating Share Button on Mobile/Tablet for 1-Tap Access */}
      <div className="lg:hidden fixed bottom-4 right-4 z-30">
        <button
          type="button"
          onClick={() => setIsShareModalOpen(true)}
          className="min-h-[44px] bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-bold text-xs py-2.5 px-3.5 rounded-full shadow-xl border border-blue-300/40 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          title="Buka Menu Bagi Link Proyek Lomba"
        >
          <Share2 className="w-4 h-4 text-amber-300" />
          <span>Bagi Link</span>
        </button>
      </div>

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddTask}
      />

      {/* 🚨 High-Impact Urgent Alarm Modal */}
      <UrgentAlertModal
        task={urgentModalTask}
        isOpen={!!urgentModalTask}
        onClose={() => setUrgentModalTask(null)}
        onCompleteTask={handleToggleComplete}
        onShiftTask15m={(id) => handleShiftSingleTask(id, 15)}
        onOpenAiCompanion={handleOpenAiCompanion}
      />

      {/* 🎵 Setting Audio Alarm MP3 Hobi (Khusus Jadwal Hobi) */}
      <HobbyAudioSettingsModal
        isOpen={isHobbyAudioModalOpen}
        onClose={() => {
          setIsHobbyAudioModalOpen(false);
          setHobbyAudioModalTask(null);
        }}
        task={hobbyAudioModalTask}
        onSaveAudio={handleSaveHobbyAudio}
      />

      {/* ✨ Rest Guard AI Companion Modal (Micro-Step & Dynamic Evaluator) */}
      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        initialMode={aiModalMode}
        activeTask={aiActiveTask}
        allTasks={schedule}
        onApplyMicroStep={handleApplyMicroStep}
        onApplyReschedule={handleApplyReschedule}
      />

      {/* 🚀 Fokus Cepat & Study Tools Modal */}
      <StudyToolsModal
        isOpen={isStudyToolsOpen}
        onClose={() => setIsStudyToolsOpen(false)}
        onImportToSchedule={handleAddTask}
      />

      {/* 🏆 Akses & Bagi Proyek Lomba Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onShowToast={showToast}
      />

      {/* Action Toast Feedback */}
      <Toast
        message={toastMessage}
        type={toastType}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
}
