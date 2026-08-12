import React, { createContext, useContext, useState } from 'react';

const SettingsPanelHostContext = createContext<HTMLDivElement | null>(null);

export function SettingsPanelHost({ children }: { children: React.ReactNode }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  return (
    <SettingsPanelHostContext.Provider value={host}>
      {children}
      <div ref={setHost} />
    </SettingsPanelHostContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettingsPanelHost() {
  return useContext(SettingsPanelHostContext);
}
