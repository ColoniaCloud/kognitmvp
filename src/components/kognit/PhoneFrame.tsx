import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  label?: string;
}

export const PhoneFrame = ({ children, label }: Props) => (
  <div className="flex flex-col items-center gap-3">
    <div className="relative transform w-[380px] h-[780px] rounded-[3rem] bg-foreground/90 p-3 shadow-card">
      <div className="absolute inset-0 rounded-[3rem] ring-1 ring-foreground/10 pointer-events-none" />
      <div className="relative w-full h-full rounded-[2.4rem] overflow-hidden bg-background">
        {/* Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-6 rounded-full bg-foreground/90 z-50" />
        {/* Status bar */}
        <div className="absolute top-0 inset-x-0 h-10 flex items-center justify-between px-8 text-[11px] font-semibold text-foreground/80 z-40">
          <span>9:41</span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-2 rounded-sm border border-foreground/60" />
          </span>
        </div>
        <div className="absolute inset-0 pt-10 overflow-y-auto no-scrollbar">{children}</div>
      </div>
    </div>
    {label && <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">{label}</span>}
  </div>
);
