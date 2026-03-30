import { DateTime } from "luxon";

export const LAYER_TIMEZONE = "Europe/Berlin";

export function formatLayerDateTime(tsMs: number) {
  return DateTime.fromMillis(tsMs, { zone: LAYER_TIMEZONE }).toFormat(
    "dd/MM/yyyy HH:mm",
  );
}

export function parseLayerStartTime(input: string): number | null {
  const trimmed = input.trim();

  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})[\sT](\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const [, dayStr, monthStr, hourStr, minuteStr] = match;
  const day = Number(dayStr);
  const month = Number(monthStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  if (
    !Number.isFinite(day) ||
    !Number.isFinite(month) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const yearTz = DateTime.now().setZone(LAYER_TIMEZONE).year;
  const dt = DateTime.fromObject(
    {
      year: yearTz,
      month,
      day,
      hour,
      minute,
      second: 0,
      millisecond: 0,
    },
    { zone: LAYER_TIMEZONE },
  );

  if (!dt.isValid) return null;
  if (
    dt.month !== month ||
    dt.day !== day ||
    dt.hour !== hour ||
    dt.minute !== minute
  ) {
    return null;
  }

  return dt.toUTC().toMillis();
}
