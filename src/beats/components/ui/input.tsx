import type { InputHTMLAttributes } from "react";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-8 w-full min-w-0 border px-2.5 py-1 text-sm outline-none placeholder:text-mute-dim ${className}`}
      {...props}
    />
  );
}
