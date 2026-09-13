import React, { useState, memo, useCallback, useEffect } from 'react';
import { ScheduleItem } from '../types';
import {
  Check,
  Trash2,
  FastForward,
  Plus,
  Edit2,
  Sparkles,
  BookOpen,
  Music,
  Coffee,
  User,
  BellRing,
  Activity,
  Zap,
  HeartHandshake,
  Volume2,
  Square,
  Play,
  Settings2,
} from 'lucide-react';
import {
  playCheckSound,
  playShiftSound,
  playMotivationalWakeupChime,
  startContinuousHobbyAlarm,
  stopContinuousHobbyAlarm,
  subscribeHobbyAlarmState,
  playPreviewMp3,
  stopPreviewAudio,
  speakText,
  initAudioContext,
} from '../utils/audio';
import { getHobbyAudio, GLOBAL_HOBBY_AUDIO_KEY } from '../utils/hobbyAudioStorage';

interface TaskItemProps {
  item: ScheduleItem;
  isActive: boolean;
  isAlerting: boolean;
  isShiftHighlighted: boolean;
  onToggleComplete: (id: string) => void;
  onShiftSingleTask: (id: string, deltaMinutes: number) => void;
  onUpdateTask: (id: string, newTime: string, newTitle: string) => void;
  onDeleteTask: (id: string) => void;
  onOpenAiCompanion?: (mode: 'micro_step' | 'dynamic_evaluator', task: ScheduleItem) => void;
  onOpenHobbyAudioSettings?: (task: ScheduleItem) => void;
}

const getCategoryIcon = (category?: string) => {
  switch (category) {
    case 'study':
      return <BookOpen className="w-3.5 h-3.5 text-blue-600" />;
    case 'music':
      return <Music className="w-3.5 h-3.5 text-purple-600" />;
    case 'break':
      return <Coffee className="w-3.5 h-3.5 text-emerald-600" />;
    case 'work':
      return <Sparkles className="w-3.5 h-3.5 text-amber-600" />;
    default:
      return <User className="w-3.5 h-3.5 text-slate-500" />;
  }
};

/**
 * Optimized TaskItem Component: Wrapped in React.memo to prevent unnecessary re-renders
 * when other tasks are shifted or toggled.
 */
const TaskItemRow = memo<TaskItemProps>(({
  item,
  isActive,
  isAlerting,
  isShiftHighlighted,
  onToggleComplete,
  onShiftSingleTask,
  onUpdateTask,
  onDeleteTask,
  onOpenAiCompanion,
  onOpenHobbyAudioSettings,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>(item.title);
  const [editTime, setEditTime] = useState<string>(item.time);
  const [isPlayingLocalPreview, setIsPlayingLocalPreview] = useState<boolean>(false);
  const [isThisHobbyActive, setIsThisHobbyActive] = useState<boolean>(false);

  useEffect(() => {
    const unsub = subscribeHobbyAlarmState((state) => {
      setIsThisHobbyActive(state.isPlaying && state.taskId === item.id);
    });
    return () => unsub();
  }, [item.id]);

  const handleTestAudio = async (e: React.MouseEvent) => {
    e.stopPropagation();
    initAudioContext();

    if (isPlayingLocalPreview) {
      stopPreviewAudio();
      setIsPlayingLocalPreview(false);
      return;
    }

    const blobKey = item.hobbyAudioBlobKey || item.id;
    let stored = await getHobbyAudio(blobKey);
    if (!stored) {
      stored = await getHobbyAudio(GLOBAL_HOBBY_AUDIO_KEY);
    }

    if (stored) {
      const url = URL.createObjectURL(stored.blob);
      setIsPlayingLocalPreview(true);
      playPreviewMp3(url, () => {
        setIsPlayingLocalPreview(false);
        URL.revokeObjectURL(url);
      });
    } else {
      setIsPlayingLocalPreview(true);
      playMotivationalWakeupChime(item.motivationAudioTone || 'energetic');
      setTimeout(() => setIsPlayingLocalPreview(false), 2500);
    }
  };

  const startEditing = () => {
    setIsEditing(true);
    setEditTitle(item.title);
    setEditTime(item.time);
  };

  const saveEdit = () => {
    if (editTitle.trim() && editTime.trim()) {
      onUpdateTask(item.id, editTime, editTitle.trim());
    }
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  return (
    <div
      id={`task-item-${item.id}`}
      className={`group relative rounded-xl p-3 sm:p-3.5 border transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
        item.completed
          ? 'bg-slate-50/70 border-slate-200/70 opacity-50'
          : isAlerting
          ? 'bg-gradient-to-r from-amber-100/90 to-orange-50/90 border-amber-500 ring-4 ring-amber-400/30 shadow-md animate-pulse'
          : isActive
          ? 'bg-amber-50/60 border-amber-400 ring-2 ring-amber-400/20 shadow-xs'
          : isShiftHighlighted
          ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/20'
          : 'bg-white hover:bg-slate-50/60 border-slate-200/90 shadow-2xs'
      }`}
    >
      {isEditing ? (
        /* Edit Mode */
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
          <input
            type="time"
            value={editTime}
            onChange={(e) => setEditTime(e.target.value)}
            className="min-h-[44px] text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-blue-500"
          />
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Nama kegiatan..."
            className="min-h-[44px] flex-1 text-sm bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-blue-500 font-medium"
            autoFocus
          />
          <div className="flex items-center gap-1.5 justify-end">
            <button
              type="button"
              onClick={saveEdit}
              className="min-h-[44px] bg-blue-600 text-white text-xs font-bold px-3.5 py-2 rounded-lg cursor-pointer"
            >
              Simpan
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="min-h-[44px] bg-slate-200 text-slate-700 text-xs font-medium px-3 py-2 rounded-lg cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      ) : (
        /* Standard View Mode */
        <>
          {/* Left: Checkbox + Time + Title */}
          <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
            {/* Checkbox (Touch Target min 44x44px) */}
            <button
              type="button"
              onClick={() => {
                initAudioContext();
                playCheckSound();
                onToggleComplete(item.id);
              }}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all shrink-0 cursor-pointer active:scale-90 ${
                item.completed
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                  : isAlerting
                  ? 'bg-amber-500 border-amber-600 text-white shadow-sm'
                  : 'bg-white border-slate-300 hover:border-slate-400 text-transparent'
              }`}
              title={item.completed ? 'Batal selesai' : 'Tandai selesai'}
            >
              <Check className="w-5 h-5 stroke-[3]" />
            </button>

            {/* Info Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`font-mono text-xs sm:text-sm font-bold px-2 py-0.5 rounded-md ${
                    item.completed
                      ? 'bg-slate-200 text-slate-500'
                      : isAlerting
                      ? 'bg-amber-700 text-white font-extrabold shadow-xs'
                      : isActive
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-900 text-white'
                  }`}
                >
                  {item.time}
                </span>

                <span className="flex items-center gap-1 text-[11px] text-slate-600 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                  {getCategoryIcon(item.category)}
                  <span className="capitalize">{item.category || 'umum'}</span>
                </span>

                {isAlerting ? (
                  <span className="flex items-center gap-1 text-[10px] font-black text-amber-950 bg-amber-300 border border-amber-400 px-2.5 py-0.5 rounded-full shadow-2xs">
                    <BellRing className="w-3.5 h-3.5 text-amber-900 animate-bounce" />
                    <span>WAKTUNYA KEGIATAN!</span>
                  </span>
                ) : isActive ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                    <Activity className="w-3 h-3 animate-pulse" />
                    <span>Sedang Berjalan</span>
                  </span>
                ) : null}
              </div>

              <div
                className={`text-sm sm:text-base font-semibold mt-1 truncate ${
                  item.completed
                    ? 'text-slate-400 line-through'
                    : isAlerting
                    ? 'text-amber-950 font-bold'
                    : 'text-slate-900'
                }`}
              >
                {item.title}
              </div>

              {/* AI Micro-Step Display if attached */}
              {item.microStep && (
                <div className="mt-1.5 flex items-start justify-between gap-1.5 text-xs text-amber-950 bg-amber-50/90 border border-amber-200/80 rounded-lg px-2.5 py-1.5">
                  <div className="flex items-start gap-1.5 flex-1 min-w-0">
                    <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span className="leading-tight font-medium">
                      <strong className="font-bold text-amber-900">Langkah Pertama:</strong> {item.microStep}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      initAudioContext();
                      speakText(item.microStep!);
                    }}
                    className="p-1 hover:bg-amber-200/80 rounded text-amber-800 transition-colors shrink-0 cursor-pointer"
                    title="Dengarkan Suara AI (Text-to-Speech)"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Special Hobby Continuous Audio Controls & Status */}
              {(item.category === 'music' || item.motivationAudioTone) && (
                <div
                  className={`mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs rounded-xl p-2.5 border transition-all ${
                    isThisHobbyActive
                      ? 'bg-rose-50 border-rose-400 text-rose-950 ring-2 ring-rose-400/40'
                      : 'bg-purple-50/90 border-purple-200/90 text-purple-950'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        isThisHobbyActive
                          ? 'bg-rose-600 text-white animate-bounce'
                          : 'bg-purple-600 text-white'
                      }`}
                    >
                      <Music className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold block truncate text-xs">
                        Audio Hobi: {item.hobbyAudioName || 'Audio Motivasi Hobi (MP3)'}
                      </span>
                      <span className="text-[10px] text-purple-700 block leading-tight">
                        {isThisHobbyActive
                          ? '🔴 SEDANG BERPUTAR — Putar terus sampai Anda klik Berhenti!'
                          : 'Otomatis berputar saat jam tiba hingga ditekan Berhenti'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    {isThisHobbyActive ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          stopContinuousHobbyAlarm();
                        }}
                        className="min-h-[34px] px-3 py-1 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-xs rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer border border-rose-300 animate-pulse"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>BERHENTI</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleTestAudio}
                          className="min-h-[30px] px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-800 border border-purple-300 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="Tes putar audio hobi"
                        >
                          {isPlayingLocalPreview ? (
                            <>
                              <Square className="w-3 h-3 fill-current text-rose-600" />
                              <span className="text-rose-600">Stop</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 fill-current text-purple-600" />
                              <span>Tes</span>
                            </>
                          )}
                        </button>

                        {onOpenHobbyAudioSettings && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenHobbyAudioSettings(item);
                            }}
                            className="min-h-[30px] px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer shadow-2xs transition-colors"
                            title="Atur / upload file MP3 untuk jadwal ini"
                          >
                            <Settings2 className="w-3 h-3" />
                            <span>Setting MP3</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Quick Shift, AI Helpers & Actions */}
          <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
            {/* AI Micro-Step Trigger */}
            {onOpenAiCompanion && !item.completed && (
              <button
                type="button"
                onClick={() => onOpenAiCompanion('micro_step', item)}
                className="min-h-[38px] flex items-center gap-1 text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 px-2.5 py-1.5 rounded-xl active:scale-95 transition-all cursor-pointer"
                title="Sederhanakan jadi micro-step aksi fisik pertama"
              >
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Micro-Step</span>
              </button>
            )}

            {/* AI Dynamic Evaluator (Mager / Buntu) Trigger */}
            {onOpenAiCompanion && !item.completed && (
              <button
                type="button"
                onClick={() => onOpenAiCompanion('dynamic_evaluator', item)}
                className="min-h-[38px] flex items-center gap-1 text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 px-2.5 py-1.5 rounded-xl active:scale-95 transition-all cursor-pointer"
                title="Lagi malas atau mau nyerah? Dapatkan empati & solusi reschedule"
              >
                <HeartHandshake className="w-3 h-3 text-rose-500" />
                <span>Buntu?</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                initAudioContext();
                playShiftSound();
                onShiftSingleTask(item.id, 15);
              }}
              className="min-h-[38px] flex items-center gap-1 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1.5 rounded-xl active:scale-95 transition-all cursor-pointer"
              title="Geser jam mulai kegiatan ini dan jadwal setelahnya +15 menit"
            >
              <FastForward className="w-3.5 h-3.5 text-amber-600" />
              <span>+15m</span>
            </button>

            <button
              type="button"
              onClick={startEditing}
              className="min-h-[38px] min-w-[38px] flex items-center justify-center p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Edit jam atau nama"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onDeleteTask(item.id)}
              className="min-h-[38px] min-w-[38px] flex items-center justify-center p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              title="Hapus kegiatan ini"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
});

TaskItemRow.displayName = 'TaskItemRow';

interface TaskListProps {
  items: ScheduleItem[];
  currentTime: string;
  onToggleComplete: (id: string) => void;
  onShiftSingleTask: (id: string, deltaMinutes: number) => void;
  onUpdateTask: (id: string, newTime: string, newTitle: string) => void;
  onDeleteTask: (id: string) => void;
  onAddNewTask: () => void;
  highlightedTaskId?: string | null;
  currentAlertingTaskId?: string | null;
  onOpenAiCompanion?: (mode?: 'micro_step' | 'dynamic_evaluator', task?: ScheduleItem) => void;
  onOpenHobbyAudioSettings?: (task: ScheduleItem) => void;
}

export const TaskList: React.FC<TaskListProps> = memo(({
  items,
  currentTime,
  onToggleComplete,
  onShiftSingleTask,
  onUpdateTask,
  onDeleteTask,
  onAddNewTask,
  highlightedTaskId,
  currentAlertingTaskId,
  onOpenAiCompanion,
  onOpenHobbyAudioSettings,
}) => {
  // Determine current active task index based on time comparison
  const findActiveIndex = (): number => {
    if (items.length === 0) return -1;
    let activeIdx = -1;
    for (let i = 0; i < items.length; i++) {
      if (!items[i].completed && items[i].time <= currentTime) {
        activeIdx = i;
      }
    }
    if (activeIdx === -1) {
      activeIdx = items.findIndex((i) => !i.completed);
    }
    return activeIdx;
  };

  const activeTaskIndex = findActiveIndex();

  const hobbyItems = items.filter((i) => i.category === 'music');

  return (
    <section
      id="task-list-section"
      className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/90"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Daftar Jadwal Hari Ini</span>
            <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">
              {items.length} Sesi
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Centang untuk selesai • Notifikasi otomatis berbunyi saat jam mulai kegiatan
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {onOpenHobbyAudioSettings && hobbyItems.length > 0 && (
            <button
              type="button"
              onClick={() => onOpenHobbyAudioSettings(hobbyItems[0])}
              className="min-h-[40px] flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300/80 text-xs font-bold py-2 px-3 rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer"
              title="Atur Audio MP3 untuk Jadwal Hobi"
            >
              <Music className="w-3.5 h-3.5 text-purple-600" />
              <span>Setting Audio MP3</span>
            </button>
          )}

          {onOpenAiCompanion && (
            <button
              type="button"
              onClick={() => onOpenAiCompanion('micro_step')}
              className="min-h-[40px] flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 text-xs font-bold py-2 px-3 rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer"
              title="Buka AI Micro-Step Notifier & Teman Akuntabilitas"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Rest Guard AI</span>
            </button>
          )}

          <button
            id="add-task-header-btn"
            type="button"
            onClick={onAddNewTask}
            className="min-h-[40px] flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 px-3.5 rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah</span>
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <p className="text-sm font-semibold text-slate-800">Daftar jadwal kosong</p>
          <p className="text-xs text-slate-500 mt-1 mb-3">
            Pilih salah satu template preset di panel samping atau buat jadwal sendiri.
          </p>
          <button
            type="button"
            onClick={onAddNewTask}
            className="min-h-[44px] inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Jadwal</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item, index) => {
            const isExactTimeAlert = item.time === currentTime && !item.completed;
            const isAlerting = currentAlertingTaskId === item.id || isExactTimeAlert;
            const isActive = !item.completed && index === activeTaskIndex;
            const isShiftHighlighted = highlightedTaskId === item.id;

            return (
              <TaskItemRow
                key={item.id}
                item={item}
                isActive={isActive}
                isAlerting={isAlerting}
                isShiftHighlighted={isShiftHighlighted}
                onToggleComplete={onToggleComplete}
                onShiftSingleTask={onShiftSingleTask}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
                onOpenAiCompanion={onOpenAiCompanion}
                onOpenHobbyAudioSettings={onOpenHobbyAudioSettings}
              />
            );
          })}
        </div>
      )}
    </section>
  );
});

TaskList.displayName = 'TaskList';
