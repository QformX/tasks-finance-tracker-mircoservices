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
    return (
      <div className="h-[32px] bg-surface flex items-center select-none shrink-0 z-50 w-full px-3">
         {/* Traffic Lights (Left mapped) - NO DRAG REGION HERE */}
         <div className="flex gap-[8px] items-center z-50 mr-4">
            <button 
              onClick={handleClose}
              className="w-[12px] h-[12px] rounded-full bg-[#FF5F57] hover:bg-[#BF4942] border-[0.5px] border-[#E0443E] flex items-center justify-center group focus:outline-none transition-colors"
              title="Close"
            >
               <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-black/60 leading-none">✕</span>
            </button>
            <button 
              onClick={handleMinimize}
              className="w-[12px] h-[12px] rounded-full bg-[#FEBC2E] hover:bg-[#DFA026] border-[0.5px] border-[#D89E24] flex items-center justify-center group focus:outline-none transition-colors"
               title="Minimize"
            >
               <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-black/60 leading-none">−</span>
            </button>
            <button 
              onClick={handleMaximize}
              className="w-[12px] h-[12px] rounded-full bg-[#28C840] hover:bg-[#1D9930] border-[0.5px] border-[#1AAB29] flex items-center justify-center group focus:outline-none transition-colors"
               title="Maximize"
            >
               <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-black/60 leading-none">＋</span>
            </button>
         </div>
         
         {/* Drag Region covering the rest of the bar */}
         <div className="flex-1 h-full flex items-center justify-center" data-tauri-drag-region>
           {/* Optional Title can go here */}
         </div>
         
         {/* Spacer to balance the layout */}
         <div className="w-[52px]" data-tauri-drag-region /> 
      </div>
    );
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
