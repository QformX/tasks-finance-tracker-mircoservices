import { getCurrentWindow } from '@tauri-apps/api/window';
import { useState, useEffect, useRef } from 'react';

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const updateMaximizedState = async () => {
      const appWindow = getCurrentWindow();
      setIsMaximized(await appWindow.isMaximized());
    };

    updateMaximizedState();

    const appWindow = getCurrentWindow();
    
    const handleResize = () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        updateMaximizedState();
      }, 200);
    };

    const unlisten = appWindow.listen('tauri://resize', handleResize);

    return () => {
      unlisten.then(f => f());
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const appWindow = getCurrentWindow();

  return (
    <div className="h-[32px] bg-sidebar-dark flex items-center select-none shrink-0 z-50 w-full">
      <div data-tauri-drag-region className="flex-1 h-full" />
      <div className="flex h-full">
        <button 
          className="inline-flex justify-center items-center w-[46px] h-full hover:bg-white/10 transition-colors focus:outline-none"
          onClick={async () => {
            try {
              await appWindow.minimize();
            } catch (e) {
              console.error('Failed to minimize:', e);
            }
          }}
        >
          <span className="material-symbols-outlined text-text-secondary hover:text-white text-[18px]">remove</span>
        </button>
        <button 
          className="inline-flex justify-center items-center w-[46px] h-full hover:bg-white/10 transition-colors focus:outline-none"
          onClick={async () => {
            try {
              if (await appWindow.isMaximized()) {
                await appWindow.unmaximize();
              } else {
                await appWindow.maximize();
              }
            } catch (e) {
              console.error('Failed to toggle maximize:', e);
            }
          }}
        >
          <span className="material-symbols-outlined text-text-secondary hover:text-white text-[16px]">
            {isMaximized ? 'filter_none' : 'crop_square'}
          </span>
        </button>
        <button 
          className="inline-flex justify-center items-center w-[46px] h-full hover:bg-red-500 group transition-colors focus:outline-none"
          onClick={async () => {
            try {
              await appWindow.close();
            } catch (e) {
              console.error('Failed to close:', e);
            }
          }}
        >
          <span className="material-symbols-outlined text-text-secondary group-hover:text-white text-[18px]">close</span>
        </button>
      </div>
    </div>
  );
}
