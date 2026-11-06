import type { Shift, WorkDay } from "@/lib/api/types";

// A shift's usual hours, used when a work day has no "from / to" times of its own.
export const SHIFT_HOURS: Record<Shift, { start: string; end: string }> = {
  morning: { start: "09:00", end: "13:00" },
  evening: { start: "16:00", end: "20:00" },
};

// The hours a doctor really works on that day: their own times if set, otherwise the shift's usual hours.
export function hoursOf(day: WorkDay) {
  return { start: day.start || SHIFT_HOURS[day.shift].start, end: day.end || SHIFT_HOURS[day.shift].end };
}
