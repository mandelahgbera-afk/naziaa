/* The NAZIA wordmark as set on the bottle label: wide-tracked serif capitals. */
export function Wordmark({ className = "", sub = true }: { className?: string; sub?: boolean }) {
  return (
    <span className={`flex flex-col items-center leading-none ${className}`}>
      <span className="font-serif text-[1.55rem] tracking-[0.34em] md:text-[1.8rem]" style={{ marginRight: "-0.34em" }}>
        NAZIA
      </span>
      {sub && <span className="mt-1 text-[0.52rem] tracking-[0.5em] opacity-80" style={{ marginRight: "-0.5em" }}>BOTANICS</span>}
    </span>
  );
}
