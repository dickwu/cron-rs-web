'use client';

import React from 'react';

interface OutputViewerProps {
  content: string;
  variant?: 'stdout' | 'stderr';
}

export function OutputViewer({ content, variant = 'stdout' }: OutputViewerProps) {
  if (!content || content.trim() === '') {
    return (
      <div className="output-viewer output-viewer-empty">
        No output captured
      </div>
    );
  }

  return (
    <pre
      className={`output-viewer ${variant === 'stderr' ? 'output-viewer-stderr' : ''}`}
      role="log"
    >
      {content}
    </pre>
  );
}
