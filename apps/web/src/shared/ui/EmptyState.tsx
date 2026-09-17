import React from 'react';

export default function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-4 animate-popIn">
        {icon}
      </div>
      <p className="text-base font-semibold text-white mb-1">{title}</p>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}
