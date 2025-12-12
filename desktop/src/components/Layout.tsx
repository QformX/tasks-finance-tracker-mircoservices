import { type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TitleBar } from "./TitleBar";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-sidebar-dark text-text-primary font-display selection:bg-primary selection:text-white">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col h-full pr-[10px] pb-[10px] overflow-hidden">
          <main className="flex-1 flex flex-col h-full bg-background-dark relative overflow-hidden rounded-xl border border-white/5">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
