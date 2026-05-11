'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Checkbox,
  Col,
  Divider,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Typography,
} from 'antd';
import { getSchedulePreview } from '@/lib/api';
import { describeSchedule } from '@/lib/schedule';
import { fmtDateTime } from '@/lib/date';
import {
  applyCommonPreset,
  buildOnCalendarExpression,
  CommonSchedulePreset,
  defaultScheduleBuilderState,
  inferCommonPreset,
  NumericFieldMode,
  NumericFieldState,
  parseScheduleBuilderState,
  ScheduleBuilderState,
} from '@/lib/scheduleBuilder';

interface SchedulePickerModalProps {
  open: boolean;
  value?: string;
  originalCronExpression?: string | null;
  onCancel: () => void;
  onApply: (value: string) => void;
}

const minuteOptions = Array.from({ length: 60 }, (_, value) => ({
  label: value.toString().padStart(2, '0'),
  value,
}));

const hourOptions = Array.from({ length: 24 }, (_, value) => ({
  label: value.toString().padStart(2, '0'),
  value,
}));

const dayOfMonthOptions = Array.from({ length: 31 }, (_, index) => ({
  label: `${index + 1}`,
  value: index + 1,
}));

const monthOptions = [
  { label: 'Jan', value: 1 },
  { label: 'Feb', value: 2 },
  { label: 'Mar', value: 3 },
  { label: 'Apr', value: 4 },
  { label: 'May', value: 5 },
  { label: 'Jun', value: 6 },
  { label: 'Jul', value: 7 },
  { label: 'Aug', value: 8 },
  { label: 'Sep', value: 9 },
  { label: 'Oct', value: 10 },
  { label: 'Nov', value: 11 },
  { label: 'Dec', value: 12 },
];

const weekdayOptions = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

type BuilderView = 'common' | 'advanced';

function fieldModeOptions(includeEvery: boolean = true) {
  const options = [
    { label: 'Any', value: 'any' },
    { label: 'Exact', value: 'exact' },
    { label: 'Range', value: 'range' },
  ];

  if (includeEvery) {
    options.push({ label: 'Every N', value: 'every' });
  }

  return options;
}

export function SchedulePickerModal({
  open,
  value,
  originalCronExpression,
  onCancel,
  onApply,
}: SchedulePickerModalProps) {
  const [view, setView] = useState<BuilderView>('common');
  const [preset, setPreset] = useState<CommonSchedulePreset>('daily');
  const [builderState, setBuilderState] = useState<ScheduleBuilderState>(
    defaultScheduleBuilderState()
  );
  const [unsupportedExpression, setUnsupportedExpression] = useState<string | null>(null);
  const [preview, setPreview] = useState<string[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const parsed = parseScheduleBuilderState(value || '*-*-* 00:00:00');
    setBuilderState(parsed.state);
    setUnsupportedExpression(parsed.unsupportedExpression);

    const inferredPreset = parsed.preset || inferCommonPreset(parsed.state) || 'daily';
    setPreset(inferredPreset);
    setView(parsed.preset ? 'common' : 'advanced');
  }, [open, value]);

  const expression = useMemo(
    () => buildOnCalendarExpression(builderState),
    [builderState]
  );
  const summary = useMemo(() => describeSchedule(expression).summary, [expression]);

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewError(null);

      try {
        const times = await getSchedulePreview(expression, 5);
        setPreview(times);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Could not preview schedule';
        setPreviewError(msg);
        setPreview([]);
      } finally {
        setPreviewLoading(false);
      }
    }, 200);

    return () => window.clearTimeout(timer);
  }, [expression, open]);

  const applyPreset = (nextPreset: CommonSchedulePreset) => {
    setPreset(nextPreset);
    setBuilderState((current) => applyCommonPreset(nextPreset, current));
  };

  const updateField = (
    key: keyof Pick<ScheduleBuilderState, 'minute' | 'hour' | 'dayOfMonth' | 'month'>,
    patch: Partial<NumericFieldState>
  ) => {
    setBuilderState((current) => ({
      ...current,
      [key]: {
        ...current[key],
        ...patch,
      },
    }));
  };

  const renderNumericField = (
    label: string,
    fieldKey: keyof Pick<ScheduleBuilderState, 'minute' | 'hour' | 'dayOfMonth' | 'month'>,
    field: NumericFieldState,
    options: Array<{ label: string; value: number }>,
    includeEvery: boolean = true
  ) => (
    <div style={{ marginBottom: 16 }}>
      <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
        {label}
      </Typography.Text>
      <Segmented
        options={fieldModeOptions(includeEvery)}
        value={field.mode}
        onChange={(mode) =>
          updateField(fieldKey, { mode: mode as NumericFieldMode })
        }
      />
      <div style={{ marginTop: 12 }}>
        {field.mode === 'exact' && (
          <Select
            style={{ width: '100%' }}
            options={options}
            value={field.value}
            onChange={(nextValue) => updateField(fieldKey, { value: nextValue })}
          />
        )}
        {field.mode === 'range' && (
          <Space style={{ width: '100%' }} wrap>
            <Select
              style={{ minWidth: 120 }}
              options={options}
              value={field.start}
              onChange={(nextValue) =>
                updateField(fieldKey, {
                  start: nextValue,
                  end: Math.max(nextValue, field.end),
                })
              }
            />
            <Typography.Text type="secondary">to</Typography.Text>
            <Select
              style={{ minWidth: 120 }}
              options={options.filter((option) => option.value >= field.start)}
              value={Math.max(field.end, field.start)}
              onChange={(nextValue) => updateField(fieldKey, { end: nextValue })}
            />
          </Space>
        )}
        {field.mode === 'every' && (
          <Space style={{ width: '100%' }} wrap>
            <Typography.Text type="secondary">Every</Typography.Text>
            <Select
              style={{ minWidth: 120 }}
              options={options.slice(1).map((option) => ({
                label: option.label,
                value: option.value,
              }))}
              value={field.step}
              onChange={(nextValue) => updateField(fieldKey, { step: nextValue })}
            />
            <Typography.Text type="secondary">{label.toLowerCase()}</Typography.Text>
          </Space>
        )}
      </div>
    </div>
  );

  const renderCommonBuilder = () => (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div>
        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
          Pattern
        </Typography.Text>
        <Segmented
          block
          options={[
            { label: 'Minutely', value: 'minutely' },
            { label: 'Hourly', value: 'hourly' },
            { label: 'Daily', value: 'daily' },
            { label: 'Weekly', value: 'weekly' },
            { label: 'Monthly', value: 'monthly' },
            { label: 'Yearly', value: 'yearly' },
          ]}
          value={preset}
          onChange={(value) => applyPreset(value as CommonSchedulePreset)}
        />
      </div>

      {preset === 'hourly' && renderNumericField('Minute', 'minute', builderState.minute, minuteOptions, false)}
      {preset === 'daily' && (
        <Row gutter={16}>
          <Col span={12}>{renderNumericField('Hour', 'hour', builderState.hour, hourOptions, false)}</Col>
          <Col span={12}>{renderNumericField('Minute', 'minute', builderState.minute, minuteOptions, false)}</Col>
        </Row>
      )}
      {preset === 'weekly' && (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div>
            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
              Weekdays
            </Typography.Text>
            <Checkbox.Group
              value={builderState.weekdays}
              onChange={(values) =>
                setBuilderState((current) => ({
                  ...current,
                  weekdays: (values as number[]).sort((left, right) => left - right),
                }))
              }
            >
              <Space wrap>
                {weekdayOptions.map((option) => (
                  <Checkbox key={option.value} value={option.value}>
                    {option.label}
                  </Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          </div>
          <Row gutter={16}>
            <Col span={12}>{renderNumericField('Hour', 'hour', builderState.hour, hourOptions, false)}</Col>
            <Col span={12}>{renderNumericField('Minute', 'minute', builderState.minute, minuteOptions, false)}</Col>
          </Row>
        </Space>
      )}
      {preset === 'monthly' && (
        <Row gutter={16}>
          <Col span={8}>
            {renderNumericField('Day', 'dayOfMonth', builderState.dayOfMonth, dayOfMonthOptions, false)}
          </Col>
          <Col span={8}>
            {renderNumericField('Hour', 'hour', builderState.hour, hourOptions, false)}
          </Col>
          <Col span={8}>
            {renderNumericField('Minute', 'minute', builderState.minute, minuteOptions, false)}
          </Col>
        </Row>
      )}
      {preset === 'yearly' && (
        <Row gutter={16}>
          <Col span={6}>
            {renderNumericField('Month', 'month', builderState.month, monthOptions, false)}
          </Col>
          <Col span={6}>
            {renderNumericField('Day', 'dayOfMonth', builderState.dayOfMonth, dayOfMonthOptions, false)}
          </Col>
          <Col span={6}>
            {renderNumericField('Hour', 'hour', builderState.hour, hourOptions, false)}
          </Col>
          <Col span={6}>
            {renderNumericField('Minute', 'minute', builderState.minute, minuteOptions, false)}
          </Col>
        </Row>
      )}
    </Space>
  );

  const renderAdvancedBuilder = () => (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Row gutter={16}>
        <Col span={12}>{renderNumericField('Minute', 'minute', builderState.minute, minuteOptions)}</Col>
        <Col span={12}>{renderNumericField('Hour', 'hour', builderState.hour, hourOptions)}</Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          {renderNumericField('Day of Month', 'dayOfMonth', builderState.dayOfMonth, dayOfMonthOptions)}
        </Col>
        <Col span={12}>
          {renderNumericField('Month', 'month', builderState.month, monthOptions)}
        </Col>
      </Row>
      <div>
        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
          Day of Week
        </Typography.Text>
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          Leave empty to match any day.
        </Typography.Text>
        <Checkbox.Group
          value={builderState.weekdays}
          onChange={(values) =>
            setBuilderState((current) => ({
              ...current,
              weekdays: (values as number[]).sort((left, right) => left - right),
            }))
          }
        >
          <Space wrap>
            {weekdayOptions.map((option) => (
              <Checkbox key={option.value} value={option.value}>
                {option.label}
              </Checkbox>
            ))}
          </Space>
        </Checkbox.Group>
      </div>
    </Space>
  );

  return (
    <Modal
      title="Set Schedule"
      open={open}
      onCancel={onCancel}
      onOk={() => onApply(expression)}
      okText="Apply Schedule"
      width={760}
      destroyOnHidden
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {originalCronExpression && (
          <Alert
            type="info"
            showIcon
            message={`Imported cron source: ${originalCronExpression}`}
          />
        )}

        {unsupportedExpression && (
          <Alert
            type="warning"
            showIcon
            message="This existing schedule can't be edited exactly in the click builder."
            description={
              <span>
                Current value: <span className="mono">{unsupportedExpression}</span>. Choosing a
                new schedule here will replace it with a supported builder value.
              </span>
            }
          />
        )}

        <div>
          <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
            Builder
          </Typography.Text>
          <Segmented
            options={[
              { label: 'Common', value: 'common' },
              { label: 'Advanced', value: 'advanced' },
            ]}
            value={view}
            onChange={(value) => setView(value as BuilderView)}
          />
        </div>

        {view === 'common' ? renderCommonBuilder() : renderAdvancedBuilder()}

        <Divider style={{ margin: '8px 0' }} />

        <div>
          <Typography.Text type="secondary" style={{ display: 'block' }}>
            Summary
          </Typography.Text>
          <Typography.Text strong>{summary}</Typography.Text>
          <Typography.Text className="mono" type="secondary" style={{ display: 'block', marginTop: 4 }}>
            {expression}
          </Typography.Text>
        </div>

        <div>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            Next runs
          </Typography.Text>
          {previewLoading ? (
            <Typography.Text type="secondary">Loading preview...</Typography.Text>
          ) : previewError ? (
            <Typography.Text type="danger">{previewError}</Typography.Text>
          ) : preview.length === 0 ? (
            <Typography.Text type="secondary">No preview available</Typography.Text>
          ) : (
            preview.map((time) => (
              <div key={time} className="mono" style={{ fontSize: 12, color: '#595959' }}>
                {fmtDateTime(time)}
              </div>
            ))
          )}
        </div>
      </Space>
    </Modal>
  );
}
