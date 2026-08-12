import React from 'react';
import { Moon, Sun, Check } from 'lucide-react';
import { useThemeStore } from '@/shared/model/useThemeStore';
import { HoverFlyout } from './HoverFlyout';
import { MenuItem } from './MenuItem';

export function ThemeMenuItem() {
  const theme = useThemeStore((s) => s.theme);

  return (
    <HoverFlyout
      trigger={({ toggle }) => (
        <MenuItem icon={Moon} label="Change appearance" hasChevron onClick={toggle} />
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white bg-white/10">
          <Moon size={16} className="text-gray-300" />
          <span className="flex-1 text-left font-medium">Dark</span>
          {theme === 'dark' && <Check size={16} className="text-purple-400" />}
        </div>
        <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 opacity-50 cursor-not-allowed">
          <Sun size={16} />
          <span className="flex-1 text-left font-medium">Light</span>
          <span className="text-[10px] font-bold uppercase tracking-wide bg-white/10 text-gray-400 px-1.5 py-0.5 rounded-md">
            Soon
          </span>
        </div>
      </div>
    </HoverFlyout>
  );
}
