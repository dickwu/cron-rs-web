export interface ScheduleDescription {
  summary: string;
  detail: string;
}

const dayNameValues: Array<[string, string]> = [
  ['sun', '0'],
  ['mon', '1'],
  ['tue', '2'],
  ['wed', '3'],
  ['thu', '4'],
  ['fri', '5'],
  ['sat', '6'],
];

const monthNameValues: Array<[string, string]> = [
  ['jan', '1'],
  ['feb', '2'],
  ['mar', '3'],
  ['apr', '4'],
  ['may', '5'],
  ['jun', '6'],
  ['jul', '7'],
  ['aug', '8'],
  ['sep', '9'],
  ['oct', '10'],
  ['nov', '11'],
  ['dec', '12'],
];

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

function replaceCaseInsensitive(value: string, needle: string, replacement: string): string {
  return value.replace(new RegExp(needle, 'gi'), replacement);
}

function normalizeNamedField(field: string, names: Array<[string, string]>): string {
  let normalized = field;
  for (const [name, replacement] of names) {
    normalized = replaceCaseInsensitive(normalized, name, replacement);
  }
  return normalized;
}

/**
 * Convert one numeric cron field (minute, hour, day-of-month, month) to the
 * systemd OnCalendar component syntax:
 *   `*`      -> `*`
 *   `*` + `/N` -> `<origin>/N`  (systemd rejects a `*` step origin)
 *   `A-B`    -> `A..B`
 *   `A-B/N`  -> `A..B/N`
 *   `A/N`    -> `A/N`
 * Every comma-separated token is converted, not just the first one.
 */
function cronFieldToCalendar(field: string, origin: string, label: string): string {
  if (field === '*' || field === '?') return '*';
  return field
    .split(',')
    .map((token) => {
      const [base, step, ...rest] = token.split('/');
      if (rest.length > 0 || base === '' || step === '') {
        throw new Error(`invalid cron ${label} field: ${field}`);
      }
      if (step !== undefined && !/^\d+$/.test(step)) {
        throw new Error(`invalid cron ${label} step: ${token}`);
      }
      const suffix = step !== undefined ? `/${step}` : '';
      if (base === '*') {
        return step !== undefined ? `${origin}${suffix}` : '*';
      }
      const range = base.match(/^(\d+)-(\d+)$/);
      if (range) {
        return `${range[1]}..${range[2]}${suffix}`;
      }
      if (/^\d+$/.test(base)) {
        return `${base}${suffix}`;
      }
      throw new Error(`unsupported cron ${label} value: ${token}`);
    })
    .join(',');
}

function dayNumberToName(value: string): string {
  const day = Number(value);
  switch (day) {
    case 0:
    case 7:
      return 'Sun';
    case 1:
      return 'Mon';
    case 2:
      return 'Tue';
    case 3:
      return 'Wed';
    case 4:
      return 'Thu';
    case 5:
      return 'Fri';
    case 6:
      return 'Sat';
    default:
      throw new Error(`unsupported day of week: ${value}`);
  }
}

function normalizeDayOfWeek(field: string): string | null {
  if (field === '*' || field === '?') {
    return null;
  }

  const normalizedField = normalizeNamedField(field, dayNameValues);
  const parts = normalizedField.split(',').map((token) => {
    if (token.includes('/')) {
      throw new Error('day-of-week step values are not supported');
    }

    const range = token.split('-');
    if (range.length === 2) {
      return `${dayNumberToName(range[0])}..${dayNumberToName(range[1])}`;
    }

    return dayNumberToName(token);
  });

  return parts.join(',');
}

function cronMacroToOnCalendar(macroName: string): string {
  switch (macroName.toLowerCase()) {
    case '@hourly':
      return '*-*-* *:00:00';
    case '@daily':
    case '@midnight':
      return '*-*-* 00:00:00';
    case '@weekly':
      return 'Sun *-*-* 00:00:00';
    case '@monthly':
      return '*-*-01 00:00:00';
    case '@yearly':
    case '@annually':
      return '*-01-01 00:00:00';
    case '@reboot':
      throw new Error('@reboot has no timer schedule equivalent');
    default:
      throw new Error(`unsupported cron macro: ${macroName}`);
  }
}

function cronFieldsToOnCalendar(fields: string[]): string {
  if (fields.length !== 5) {
    throw new Error('expected exactly 5 cron fields');
  }

  const minute = cronFieldToCalendar(fields[0], '0', 'minute');
  const hour = cronFieldToCalendar(fields[1], '0', 'hour');
  const dayOfMonth = cronFieldToCalendar(fields[2], '1', 'day-of-month');
  const month = cronFieldToCalendar(
    normalizeNamedField(fields[3], monthNameValues),
    '1',
    'month',
  );
  const dayOfWeek = normalizeDayOfWeek(fields[4]);

  if (dayOfWeek && dayOfMonth !== '*') {
    throw new Error(
      'cron with both day-of-month and day-of-week cannot be represented as one systemd schedule'
    );
  }

  const date = `*-${month}-${dayOfMonth}`;
  const time = `${hour}:${minute}:00`;

  return dayOfWeek ? `${dayOfWeek} ${date} ${time}` : `${date} ${time}`;
}

function isCronExpression(expression: string): boolean {
  const trimmed = expression.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('@')) return true;
  return trimmed.split(/\s+/).length === 5;
}

export function normalizeScheduleExpression(expression: string): string {
  const trimmed = expression.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (trimmed.startsWith('@')) {
    return cronMacroToOnCalendar(trimmed);
  }

  const fields = trimmed.split(/\s+/);
  if (fields.length === 5) {
    return cronFieldsToOnCalendar(fields);
  }

  return trimmed;
}

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

  if (isCronExpression(expression)) {
    try {
      return describeSchedule(normalizeScheduleExpression(expression));
    } catch {
      return { summary: 'Custom cron schedule', detail: expression };
    }
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
