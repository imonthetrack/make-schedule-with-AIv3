import { ScheduleItem, StreakData } from '../types';
import { PRESET_TEMPLATES } from '../presets';

const STORAGE_KEYS = {
  SCHEDULE: 'jadwal_mvp_schedule_v1',
  STREAK: 'jadwal_mvp_streak_v1',
  ACTIVE_PRESET: 'jadwal_mvp_active_preset',
};

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTime24(hours: number, minutes: number): string {
  const h = String(Math.floor(hours) % 24).padStart(2, '0');
  const m = String(Math.floor(minutes) % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export function getCurrentTimeHHMM(): string {
  const now = new Date();
  return formatTime24(now.getHours(), now.getMinutes());
}

/**
 * Add or subtract minutes from a 'HH:mm' time string with 24-hour wrap
 */
export function shiftTime(timeStr: string, deltaMinutes: number): string {
  const parts = timeStr.split(':');
  if (parts.length !== 2) return timeStr;
  const hours = parseInt(parts[0], 10) || 0;
  const mins = parseInt(parts[1], 10) || 0;

  let totalMinutes = hours * 60 + mins + deltaMinutes;
  // 1440 minutes in a full day (24h)
  totalMinutes = ((totalMinutes % 1440) + 1440) % 1440;

  const newHours = Math.floor(totalMinutes / 60);
  const newMins = totalMinutes % 60;
  return formatTime24(newHours, newMins);
}

/**
 * Get default starter schedule
 */
export function getDefaultSchedule(): ScheduleItem[] {
  const defaultPreset = PRESET_TEMPLATES[0]; // Sekolah
  return defaultPreset.items.map((item, index) => ({
    id: `item-${Date.now()}-${index}`,
    ...item,
    completed: false,
  }));
}

/**
 * Load initial schedule from localStorage or fallback to default preset
 */
export function loadSchedule(): ScheduleItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error loading schedule from localStorage:', err);
  }

  return getDefaultSchedule();
}

/**
 * Save schedule to localStorage
 */
export function saveSchedule(items: ScheduleItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(items));
  } catch (err) {
    console.warn('Error saving schedule to localStorage:', err);
  }
}

/**
 * Clean completed / past tasks to prevent storage clutter
 */
export function clearCompletedSchedule(items: ScheduleItem[]): ScheduleItem[] {
  const uncompleted = items.filter((i) => !i.completed);
  saveSchedule(uncompleted);
  return uncompleted;
}

/**
 * Load Streak Data
 */
export function loadStreak(): StreakData {
  const defaultStreak: StreakData = {
    currentStreak: 1,
    bestStreak: 1,
    lastCompletedDate: null,
    history: {},
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STREAK);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...defaultStreak,
        ...parsed,
      };
    }
  } catch (err) {
    console.warn('Error loading streak:', err);
  }

  return defaultStreak;
}

/**
 * Save Streak Data
 */
export function saveStreak(streak: StreakData): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streak));
  } catch (err) {
    console.warn('Error saving streak:', err);
  }
}

/**
 * Recalculate streak when a task is checked/unchecked
 */
export function calculateUpdatedStreak(
  currentStreakData: StreakData,
  schedule: ScheduleItem[]
): StreakData {
  const today = getTodayDateString();
  const completedCount = schedule.filter((s) => s.completed).length;
  const isTargetAchieved = completedCount >= 1;

  const newHistory = { ...currentStreakData.history };
  newHistory[today] = isTargetAchieved;

  let calculatedStreak = 0;
  const checkDate = new Date();

  if (!isTargetAchieved) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Count consecutive days
  for (let i = 0; i < 365; i++) {
    const y = checkDate.getFullYear();
    const m = String(checkDate.getMonth() + 1).padStart(2, '0');
    const d = String(checkDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    if (newHistory[dateStr]) {
      calculatedStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  const updatedStreak: StreakData = {
    currentStreak: Math.max(isTargetAchieved ? 1 : 0, calculatedStreak),
    bestStreak: Math.max(
      currentStreakData.bestStreak || 0,
      Math.max(isTargetAchieved ? 1 : 0, calculatedStreak)
    ),
    lastCompletedDate: isTargetAchieved ? today : currentStreakData.lastCompletedDate,
    history: newHistory,
  };

  return updatedStreak;
}
