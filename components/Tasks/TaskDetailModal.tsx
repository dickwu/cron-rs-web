'use client';

import React from 'react';
import { Modal } from 'antd';
import { TaskDetailContent } from './TaskDetailContent';

interface TaskDetailModalProps {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
  /** Hide the Run History card (default true in modal — avoids navigating away from the host run/page). */
  hideRuns?: boolean;
}

export function TaskDetailModal({ taskId, open, onClose, hideRuns = true }: TaskDetailModalProps) {
  return (
    <Modal
      open={open && !!taskId}
      onCancel={onClose}
      footer={null}
      width={960}
      destroyOnClose
      title="Task Detail"
      centered
    >
      {taskId && (
        <TaskDetailContent
          taskId={taskId}
          hideRuns={hideRuns}
          onDeleted={onClose}
        />
      )}
    </Modal>
  );
}
