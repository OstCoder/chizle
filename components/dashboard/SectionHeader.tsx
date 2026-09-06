interface SectionHeaderProps {
  index: string;
  title: string;
  subtitle: string;
}

/** Numbered divider heading that keeps each hub module scannable. */
export function SectionHeader({ index, title, subtitle }: SectionHeaderProps) {
  return (
    <div className="animate-fade-up">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 font-mono text-xs font-semibold tracking-widest text-accent-400">
          {index}
        </span>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-white/40">{subtitle}</p>
        </div>
      </div>
      <div className="mt-2.5 h-px w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
    </div>
  );
}