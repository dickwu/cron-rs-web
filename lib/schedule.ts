export interface ScheduleDescription {
  summary: string;
  detail: string;
}

const namedSchedules: Record<string, string> = {
  minutely: 'Every minute',
  hourly: 'Every hour',
  daily: 'Every day at midnight',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semiannually: 'Twice a year',
  yearly: 'Yearly',
  annually: 'Yearly',
};

const weekdayNames: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function padTimePart(part: string): string {
  return part === '*' ? part : part.padStart(2, '0');
}

function formatTime(time: string): string | null {
  const match = time.match(/^([^:]+):([^:]+):([^:]+)$/);
  if (!match) return null;

  const [, hour, minute, second] = match;
  if (hour === '*' && minute === '*' && second === '00') return 'every minute';
  if (hour === '*' && minute === '00' && second === '00') return 'every hour';
  if (hour.includes('*') || minute.includes('*') || second.includes('*')) return null;

  const suffix = second !== '00' ? `:${padTimePart(second)}` : '';
  return `${padTimePart(hour)}:${padTimePart(minute)}${suffix}`;
}

function describeDay(day: string): string | null {
  if (day === 'Mon..Fri') return 'weekday';
  if (day === 'Sat,Sun' || day === 'Sun,Sat') return 'weekend';
  if (weekdayNames[day]) return weekdayNames[day];
  return null;
}

function dateParts(date: string): [string, string, string] | null {
  const parts = date.split('-');
  return parts.length === 3 ? [parts[0], parts[1], parts[2]] : null;
}

function rangeOrdinal(range: string): string | null {
  const match = range.match(/^(\d+)\.\.(\d+)$/);
  if (!match) return null;

  const start = Number(match[1]);
  const end = Number(match[2]);
  if (start === 1 && end === 7) return 'first';
  if (start === 8 && end === 14) return 'second';
  if (start === 15 && end === 21) return 'third';
  if (start === 22 && end === 28) return 'fourth';
  return null;
}

function parseSystemdCalendar(expression: string): ScheduleDescription | null {
  const parts = expression.split(/\s+/);
  let day: string | undefined;
  let date: string | undefined;
  let time: string | undefined;

  if (parts.length >= 3 && !parts[0].includes('-') && parts[1].includes('-')) {
    [day, date, time] = parts;
  } else if (parts.length >= 2) {
    [date, time] = parts;
  }

  if (!date || !time) return null;

  const clock = formatTime(time);
  const dateTuple = dateParts(date);
  if (!clock || !dateTuple) return null;

  const [year, month, monthDay] = dateTuple;
  const dayLabel = day ? describeDay(day) : null;

  if (date === '*-*-*' && clock === 'every minute') {
    return { summary: 'Every minute', detail: expression };
  }

  if (date === '*-*-*' && clock === 'every hour') {
    return { summary: 'Every hour', detail: expression };
  }

  if (date === '*-*-*' && dayLabel) {
    return { summary: `Every ${dayLabel} at ${clock}`, detail: expression };
  }

  if (date === '*-*-*') {
    return { summary: `Every day at ${clock}`, detail: expression };
  }

  const ordinal = dayLabel ? rangeOrdinal(monthDay) : null;
  if (year === '*' && month === '*' && ordinal && dayLabel) {
    return { summary: `Monthly on the ${ordinal} ${dayLabel} at ${clock}`, detail: expression };
  }

  if (year === '*' && month === '*' && /^\d+$/.test(monthDay)) {
    return { summary: `Monthly on day ${Number(monthDay)} at ${clock}`, detail: expression };
  }

  if (year === '*' && /^\d+$/.test(month) && /^\d+$/.test(monthDay)) {
    const monthIndex = Number(month) - 1;
    const monthLabel = monthNames[monthIndex] || `month ${Number(month)}`;
    return { summary: `Every ${monthLabel} ${Number(monthDay)} at ${clock}`, detail: expression };
  }

  return null;
}

export function describeSchedule(schedule: string): ScheduleDescription {
  const expression = schedule.trim();
  if (!expression) {
    return { summary: 'No schedule', detail: '' };
  }

  const named = namedSchedules[expression.toLowerCase()];
  if (named) {
    return { summary: named, detail: expression };
  }

  return parseSystemdCalendar(expression) || {
    summary: 'Custom systemd schedule',
    detail: expression,
  };
}
