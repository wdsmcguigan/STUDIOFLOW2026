import { ThemeToggle } from "@/components/layout/theme-toggle";
import { DensityToggle } from "@/components/layout/density-toggle";

export function TopBar({
  title,
  sub,
  actions,
}: {
  title: string;
  sub?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex items-center gap-2.5 border-b border-[var(--line)] px-4 py-3">
      <div>
        <h1 className="font-display text-[17px] font-extrabold tracking-[-0.3px]">{title}</h1>
        {sub ? <p className="text-[10.5px] text-[var(--tx-3)]">{sub}</p> : null}
      </div>
      <div className="flex-1" />
      {actions}
      <DensityToggle />
      <ThemeToggle />
    </header>
  );
}
