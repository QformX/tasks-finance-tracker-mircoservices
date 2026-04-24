import { getCurrentWindow } from '@tauri-apps/api/window';
import { useState, useEffect, useRef } from 'react';

export function TitleBar() {
  const [isMacOS, setIsMacOS] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  // Safe window access helper
  const getAppWindow = () => {
    try {
      // Direct call to getCurrentWindow, let it handle environment checks or throw
      return getCurrentWindow();
    } catch (e) {
      console.warn('Could not get current window instance:', e);
      return null;
    }
  };
  
  const appWindow = getAppWindow();

  useEffect(() => {
    // Detect OS
    const checkOS = () => {
      // Check user agent for Mac
      const ua = navigator.userAgent.toLowerCase();
      // Check platform for Mac (deprecated but useful fallback)
      const platform = (navigator as any).userAgentData?.platform || navigator.platform || '';
      
      if (ua.includes('mac') || platform.toLowerCase().includes('mac')) {
        setIsMacOS(true);
      }
    };
    checkOS();

    if (!appWindow) return;

    const updateMaximizedState = async () => {
      try {
        setIsMaximized(await appWindow.isMaximized());
      } catch (e) {
        console.error(e);
      }
    };

    updateMaximizedState();

    const handleResize = () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        updateMaximizedState();
      }, 200);
    };

    // Listen to resize event
    const unlistenPromise = appWindow.listen('tauri://resize', handleResize);

    return () => {
      unlistenPromise.then(unlisten => unlisten());
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMinimize = async () => {
    if (appWindow) await appWindow.minimize();
  };

  const handleMaximize = async () => {
    if (appWindow) {
      if (isMacOS) {
        try {
          const isFullscreen = await appWindow.isFullscreen();
          await appWindow.setFullscreen(!isFullscreen);
        } catch (e) {
          console.error(e);
        }
      } else {
        if (await appWindow.isMaximized()) {
          await appWindow.unmaximize();
        } else {
          await appWindow.maximize();
        }
      }
    }
  };

  const handleClose = async () => {
    if (appWindow) await appWindow.close();
  };

  // macOS Layout
  if (isMacOS) {
    return null; // Use native title bar
  }

  // Windows / Linux Layout
  return (
    <div className="h-[32px] bg-surface flex items-center select-none shrink-0 z-50 w-full">
      <div data-tauri-drag-region className="flex-1 h-full" />
      <div className="flex h-full">
        <button 
          className="inline-flex justify-center items-center w-[46px] h-full hover:bg-text-950/10 transition-colors focus:outline-none"
          onClick={handleMinimize}
        >
          <span className="material-symbols-outlined text-text-secondary hover:text-text-950 text-[18px]">remove</span>
        </button>
        <button 
          className="inline-flex justify-center items-center w-[46px] h-full hover:bg-text-950/10 transition-colors focus:outline-none"
          onClick={handleMaximize}
        >
          <span className="material-symbols-outlined text-text-secondary hover:text-text-950 text-[16px]">
            {isMaximized ? 'filter_none' : 'crop_square'}
          </span>
        </button>
        <button 
          className="inline-flex justify-center items-center w-[46px] h-full hover:bg-red-500 group transition-colors focus:outline-none"
          onClick={handleClose}
        >
          <span className="material-symbols-outlined text-text-secondary group-hover:text-white text-[18px]">close</span>
        </button>
      </div>
    </div>
  );
}
