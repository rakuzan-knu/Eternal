import React from 'react';

export default function FolderRow({
  icon,
  title,
  action,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  action: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-white/[0.055]"
    >
      <span
        className="flex h-8 w-8 items-center justify-center rounded-full text-black shadow-lg"
        style={{ backgroundColor: color }}
      >
        {icon}
      </span>
      <span className="flex-1 font-semibold" style={{ color }}>
        {title}
      </span>
      <span className="text-sm text-gray-500">{action}</span>
    </button>
  );
}
