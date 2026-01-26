import React from 'react';

interface TitleBarProps {
  title?: string;
}

export default function TitleBar({ title = 'Ghostwriter' }: TitleBarProps) {
  return (
    <div className="app-titlebar px-5 py-2">
      <div className="mx-auto grid max-w-5xl grid-cols-3 items-center">
        {/* Left spacer (for future controls) */}
        <div className="no-drag flex items-center">
        </div>
        {/* Centered title */}
        <div className="text-sm font-semibold tracking-wide text-slate-200 text-center">
          {title}
        </div>
        {/* Right spacer (for future controls) */}
        <div className="no-drag" />
      </div>
    </div>
  );
}
