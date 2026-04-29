import { describeSchedule, normalizeScheduleExpression } from './schedule';

export type CommonSchedulePreset =
  | 'minutely'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly';

export type NumericFieldMode = 'any' | 'exact' | 'range' | 'every';

export interface NumericFieldState {
  mode: NumericFieldMode;
  value: number;
  start: number;
  end: number;
  step: number;
}

export interface ScheduleBuilderState {
  minute: NumericFieldState;
  hour: NumericFieldState;
  dayOfMonth: NumericFieldState;
  month: NumericFieldState;
  weekdays: number[];
}

export interface ParsedScheduleBuilderState {
  state: ScheduleBuilderState;
  preset: CommonSchedulePreset | null;
  unsupportedExpression: string | null;
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function createNumericField(
  mode: NumericFieldMode,
  value: number,
  start: number,
  end: number,
  step: number
): NumericFieldState {
  return { mode, value, start, end, step };
}

export function defaultScheduleBuilderState(): ScheduleBuilderState {
  return {
    minute: createNumericField('exact', 0, 0, 15, 5),
    hour: createNumericField('exact', 0, 0, 6, 1),
    dayOfMonth: createNumericField('any', 1, 1, 7, 1),
    month: createNumericField('any', 1, 1, 1, 1),
    weekdays: [],
  };
}

function normalizeNumericField(field: NumericFieldState, min: number, max: number): NumericFieldState {
  const clamp = (value: number) => Math.min(max, Math.max(min, value));
  const start = clamp(field.start);
  const end = clamp(Math.max(field.end, start));
  return {
    mode: field.mode,
    value: clamp(field.value),
    start,
    end,
    step: Math.max(1, Math.min(max - min + 1, field.step)),
  };
}

export function buildOnCalendarExpression(state: ScheduleBuilderState): string {
  const minute = buildNumericField(state.minute, 0);
  const hour = buildNumericField(state.hour, 0);
  const dayOfMonth = buildNumericField(state.dayOfMonth, 1);
  const month = buildNumericField(state.month, 1);
  const date = `*-${month}-${dayOfMonth}`;
  const time = `${hour}:${minute}:00`;
  const weekdays = buildWeekdayExpression(state.weekdays);

  return weekdays ? `${weekdays} ${date} ${time}` : `${date} ${time}`;
}

function buildNumericField(field: NumericFieldState, origin: number): string {
  switch (field.mode) {
    case 'any':
      return '*';
    case 'exact':
      return String(field.value);
    case 'range':
      return `${Math.min(field.start, field.end)}..${Math.max(field.start, field.end)}`;
    case 'every':
      return `${origin}/${field.step}`;
    default:
      return '*';
  }
}

function buildWeekdayExpression(weekdays: number[]): string | null {
  if (!weekdays.length) {
    return null;
  }

  return [...new Set(weekdays)]
    .sort((left, right) => left - right)
    .map((weekday) => WEEKDAY_NAMES[weekday] || 'Mon')
    .join(',');
}

export function inferCommonPreset(state: ScheduleBuilderState): CommonSchedulePreset | null {
  if (
    state.minute.mode === 'any' &&
    state.hour.mode === 'any' &&
    state.dayOfMonth.mode === 'any' &&
    state.month.mode === 'any' &&
    state.weekdays.length === 0
  ) {
    return 'minutely';
  }

  if (
    state.minute.mode === 'exact' &&
    state.hour.mode === 'any' &&
    state.dayOfMonth.mode === 'any' &&
    state.month.mode === 'any' &&
    state.weekdays.length === 0
  ) {
    return 'hourly';
  }

  if (
    state.minute.mode === 'exact' &&
    state.hour.mode === 'exact' &&
    state.dayOfMonth.mode === 'any' &&
    state.month.mode === 'any'
  ) {
    return state.weekdays.length > 0 ? 'weekly' : 'daily';
  }

  if (
    state.minute.mode === 'exact' &&
    state.hour.mode === 'exact' &&
    state.dayOfMonth.mode === 'exact' &&
    state.month.mode === 'any' &&
    state.weekdays.length === 0
  ) {
    return 'monthly';
  }

  if (
    state.minute.mode === 'exact' &&
    state.hour.mode === 'exact' &&
    state.dayOfMonth.mode === 'exact' &&
    state.month.mode === 'exact' &&
    state.weekdays.length === 0
  ) {
    return 'yearly';
  }

  return null;
}

export function applyCommonPreset(
  preset: CommonSchedulePreset,
  previous: ScheduleBuilderState
): ScheduleBuilderState {
  const state = {
    minute: normalizeNumericField(previous.minute, 0, 59),
    hour: normalizeNumericField(previous.hour, 0, 23),
    dayOfMonth: normalizeNumericField(previous.dayOfMonth, 1, 31),
    month: normalizeNumericField(previous.month, 1, 12),
    weekdays: previous.weekdays.length ? previous.weekdays : [1],
  };

  switch (preset) {
    case 'minutely':
      return {
        ...state,
        minute: { ...state.minute, mode: 'any' },
        hour: { ...state.hour, mode: 'any' },
        dayOfMonth: { ...state.dayOfMonth, mode: 'any' },
        month: { ...state.month, mode: 'any' },
        weekdays: [],
      };
    case 'hourly':
      return {
        ...state,
        minute: { ...state.minute, mode: 'exact' },
        hour: { ...state.hour, mode: 'any' },
        dayOfMonth: { ...state.dayOfMonth, mode: 'any' },
        month: { ...state.month, mode: 'any' },
        weekdays: [],
      };
    case 'daily':
      return {
        ...state,
        minute: { ...state.minute, mode: 'exact' },
        hour: { ...state.hour, mode: 'exact' },
        dayOfMonth: { ...state.dayOfMonth, mode: 'any' },
        month: { ...state.month, mode: 'any' },
        weekdays: [],
      };
    case 'weekly':
      return {
        ...state,
        minute: { ...state.minute, mode: 'exact' },
        hour: { ...state.hour, mode: 'exact' },
        dayOfMonth: { ...state.dayOfMonth, mode: 'any' },
        month: { ...state.month, mode: 'any' },
        weekdays: state.weekdays.length ? state.weekdays : [1],
      };
    case 'monthly':
      return {
        ...state,
        minute: { ...state.minute, mode: 'exact' },
        hour: { ...state.hour, mode: 'exact' },
        dayOfMonth: { ...state.dayOfMonth, mode: 'exact', value: state.dayOfMonth.value || 1 },
        month: { ...state.month, mode: 'any' },
        weekdays: [],
      };
    case 'yearly':
      return {
        ...state,
        minute: { ...state.minute, mode: 'exact' },
        hour: { ...state.hour, mode: 'exact' },
        dayOfMonth: { ...state.dayOfMonth, mode: 'exact', value: state.dayOfMonth.value || 1 },
        month: { ...state.month, mode: 'exact', value: state.month.value || 1 },
        weekdays: [],
      };
    default:
      return state;
  }
}

export function parseScheduleBuilderState(expression: string): ParsedScheduleBuilderState {
  const normalizedExpression = normalizeScheduleExpression(expression);
  const fallback = applyCommonPreset('daily', defaultScheduleBuilderState());

  try {
    const state = parseOnCalendarExpression(normalizedExpression);
    return {
      state,
      preset: inferCommonPreset(state),
      unsupportedExpression: null,
    };
  } catch {
    return {
      state: fallback,
      preset: 'daily',
      unsupportedExpression: normalizedExpression,
    };
  }
}

function parseOnCalendarExpression(expression: string): ScheduleBuilderState {
  const trimmed = expression.trim();
  const parts = trimmed.split(/\s+/);

  let dayPart: string | null = null;
  let datePart = '';
  let timePart = '';

  if (parts.length >= 3 && !parts[0].includes('-') && parts[1].includes('-')) {
    [dayPart, datePart, timePart] = parts;
  } else if (parts.length === 2) {
    [datePart, timePart] = parts;
  } else {
    throw new Error('unsupported schedule format');
  }

  const dateTokens = datePart.split('-');
  const timeTokens = timePart.split(':');

  if (dateTokens.length !== 3 || timeTokens.length !== 3) {
    throw new Error('unsupported schedule format');
  }

  return {
    minute: parseNumericField(timeTokens[1], 0),
    hour: parseNumericField(timeTokens[0], 0),
    dayOfMonth: parseNumericField(dateTokens[2], 1),
    month: parseNumericField(dateTokens[1], 1),
    weekdays: parseWeekdays(dayPart),
  };
}

function parseNumericField(token: string, origin: number): NumericFieldState {
  if (token === '*') {
    return createNumericField('any', origin, origin, origin, 1);
  }

  const exact = Number(token);
  if (!Number.isNaN(exact)) {
    return createNumericField('exact', exact, exact, exact, 1);
  }

  const everyMatch = token.match(/^(\d+)\/(\d+)$/);
  if (everyMatch) {
    return createNumericField(
      'every',
      Number(everyMatch[1]),
      origin,
      origin,
      Number(everyMatch[2])
    );
  }

  const rangeMatch = token.match(/^(\d+)\.\.(\d+)$/);
  if (rangeMatch) {
    return createNumericField(
      'range',
      Number(rangeMatch[1]),
      Number(rangeMatch[1]),
      Number(rangeMatch[2]),
      1
    );
  }

  throw new Error(`unsupported numeric token: ${token}`);
}

function parseWeekdays(dayPart: string | null): number[] {
  if (!dayPart || dayPart === '*' || dayPart === '?') {
    return [];
  }

  const values: number[] = [];

  for (const token of dayPart.split(',')) {
    if (token.includes('..')) {
      const [start, end] = token.split('..');
      const startIndex = weekdayIndex(start);
      const endIndex = weekdayIndex(end);
      if (startIndex <= endIndex) {
        for (let index = startIndex; index <= endIndex; index += 1) {
          values.push(index);
        }
      } else {
        for (let index = startIndex; index <= 6; index += 1) {
          values.push(index);
        }
        for (let index = 0; index <= endIndex; index += 1) {
          values.push(index);
        }
      }
      continue;
    }

    values.push(weekdayIndex(token));
  }

  return [...new Set(values)].sort((left, right) => left - right);
}

function weekdayIndex(token: string): number {
  const index = WEEKDAY_NAMES.findIndex((weekday) => weekday.toLowerCase() === token.toLowerCase());
  if (index === -1) {
    throw new Error(`unsupported weekday token: ${token}`);
  }
  return index;
}

export function describeBuiltSchedule(state: ScheduleBuilderState): string {
  return describeSchedule(buildOnCalendarExpression(state)).summary;
}
