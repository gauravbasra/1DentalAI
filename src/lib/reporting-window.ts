export type ReportingWindowFilters = {
  period?: string;
  startDate?: string;
  endDate?: string;
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function resolveReportingWindow(filters: ReportingWindowFilters = {}) {
  const today = new Date();
  const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const period = filters.period === "custom" || filters.period === "weekly" || filters.period === "monthly" ? filters.period : "daily";
  let start = utcToday;
  let end = addDays(utcToday, 1);

  if (period === "weekly") {
    const day = utcToday.getUTCDay();
    start = addDays(utcToday, day === 0 ? -6 : 1 - day);
    end = addDays(start, 7);
  } else if (period === "monthly") {
    start = new Date(Date.UTC(utcToday.getUTCFullYear(), utcToday.getUTCMonth(), 1));
    end = new Date(Date.UTC(utcToday.getUTCFullYear(), utcToday.getUTCMonth() + 1, 1));
  } else if (period === "custom") {
    const parsedStart = filters.startDate ? new Date(`${filters.startDate}T00:00:00.000Z`) : null;
    const parsedEnd = filters.endDate ? new Date(`${filters.endDate}T00:00:00.000Z`) : null;
    if (parsedStart && !Number.isNaN(parsedStart.getTime())) start = parsedStart;
    if (parsedEnd && !Number.isNaN(parsedEnd.getTime())) end = addDays(parsedEnd, 1);
    if (end <= start) end = addDays(start, 1);
  }

  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  const previousStart = addDays(start, -days);
  const nextEnd = addDays(end, days);

  return {
    period,
    startDate: formatDate(start),
    endDate: formatDate(addDays(end, -1)),
    startTimestamp: start.toISOString(),
    endTimestamp: end.toISOString(),
    previousStartTimestamp: previousStart.toISOString(),
    nextEndTimestamp: nextEnd.toISOString(),
    days,
  };
}
