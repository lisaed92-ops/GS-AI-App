import { createContext, useContext, useState, type ReactNode } from "react";

interface DevModeContextType {
  isDevMode: boolean;
  toggle: () => void;
}

const DevModeContext = createContext<DevModeContextType>({
  isDevMode: false,
  toggle: () => {},
});

const STORAGE_KEY = "factori_dev_mode";

export function DevModeProvider({ children }: { children: ReactNode }) {
  const [isDevMode, setIsDevMode] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const toggle = () => {
    setIsDevMode((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <DevModeContext.Provider value={{ isDevMode, toggle }}>
      {children}
    </DevModeContext.Provider>
  );
}

export function useDevMode() {
  return useContext(DevModeContext);
}

