import dayjs from 'dayjs';

export type FrequencyType = 'fixed_cycle' | 'weekly';

export interface Drug {
  id: string;
  name: string;
  dosage: string;
  amount: string;
  interval: number; // e.g., 2 means "every 3 days" (skip 2 days)
  startDate: string; // ISO string
  color: string;
  stock: number;
  decrementPerDose: number;
}

export interface MedicationLog {
  drugId: string;
  takenAt: string; // ISO string (date part only for daily tracking)
}

export interface PillTrackData {
  settings: {
    notificationsEnabled: boolean;
    language: string;
  };
  drugs: Drug[];
  logs: MedicationLog[];
}

export function isTakingDrugOnDate(drug: Drug, date: dayjs.Dayjs): boolean {
  const start = dayjs(drug.startDate).startOf('day');
  const current = date.startOf('day');

  if (current.isBefore(start)) return false;

  const diffDays = current.diff(start, 'day');
  const cycle = drug.interval + 1;
  return diffDays % cycle === 0;
}

export function getScheduleForRange(drugs: Drug[], start: dayjs.Dayjs, end: dayjs.Dayjs) {
  const schedule: { [date: string]: Drug[] } = {};
  let current = start.startOf('day');
  const last = end.startOf('day');

  while (current.isBefore(last) || current.isSame(last)) {
    const dateStr = current.format('YYYY-MM-DD');
    const drugsToday = drugs.filter(drug => isTakingDrugOnDate(drug, current));
    if (drugsToday.length > 0) {
      schedule[dateStr] = drugsToday;
    }
    current = current.add(1, 'day');
  }

  return schedule;
}
