// contexts/HeaderContext.tsx
"use client";
import { createContext, useContext, useState } from "react";

type HeaderContextType = {
  title: string;
  subtitle?: string;
  setTitle: (title: string) => void;
  setSubtitle: (subtitle: string) => void;
};

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export function HeaderProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = useState("Dashboard");
  const [subtitle, setSubtitle] = useState<string | undefined>();

  return (
    <HeaderContext.Provider value={{ title, subtitle, setTitle, setSubtitle }}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeader() {
  const ctx = useContext(HeaderContext);
  if (!ctx) throw new Error("useHeader must be used within HeaderProvider");
  return ctx;
}
