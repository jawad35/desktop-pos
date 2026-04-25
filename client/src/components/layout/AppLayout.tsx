import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useHeader } from "@/contexts/HeaderContext";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { title, subtitle } = useHeader();

  // Load saved sidebar state on mount
  useEffect(() => {
    const savedState = localStorage.getItem('brainsees_sidebar_open');
    if (savedState !== null) {
      setIsSidebarOpen(savedState === 'true');
    }
  }, []);

  // Save sidebar state whenever it changes
  const handleSidebarToggle = () => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    localStorage.setItem('brainsees_sidebar_open', String(newState));
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
    localStorage.setItem('brainsees_sidebar_open', 'false');
  };

  return (
    <div className="h-screen overflow-hidden">
      <div className="flex h-full">
        {/* Sidebar with dynamic width */}
        <div 
          className={`transition-all duration-300 ease-in-out ${
            isSidebarOpen ? 'w-64' : 'w-0'
          } overflow-hidden shrink-0`}
        >
          <Sidebar 
            isOpen={isSidebarOpen} 
            onClose={handleSidebarClose}
          />
        </div>
        
        {/* Main content - takes remaining space */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header
            title={title}
            subtitle={subtitle}
            onMenuClick={() => {
              setIsSidebarOpen(true);
              localStorage.setItem('brainsees_sidebar_open', 'true');
            }}
            onSidebarToggle={handleSidebarToggle}
            isSidebarOpen={isSidebarOpen}
          />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}