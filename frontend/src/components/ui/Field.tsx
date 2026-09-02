import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string };

export function Field({ label, className = "", ...props }: Props) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</span>
      <input
        className={`w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-ink ${className}`}
        {...props}
      />
    </label>
  );
}
