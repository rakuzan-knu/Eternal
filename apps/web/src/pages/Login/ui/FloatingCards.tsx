import React from 'react';
import { MOCK_NOTIFS } from '../model/data';

export const FloatingCards: React.FC = () => {
  return (
    <div className="hidden lg:flex flex-col gap-4 max-w-xs w-full select-none transform rotate-1 hover:rotate-0 transition-transform duration-500">
      {MOCK_NOTIFS.map((card) => (
        <div
          key={card.id}
          className="flex items-center gap-4 bg-neutral-900/40 backdrop-blur-md border border-neutral-800/50 rounded-2xl p-4 shadow-lg"
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs ${card.color}`}
          >
            {card.initials}
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm text-neutral-200 font-semibold">
              <span className="text-neutral-400">{card.name}</span> {card.action}
            </p>
            <span className="text-xs text-neutral-500">{card.time}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
