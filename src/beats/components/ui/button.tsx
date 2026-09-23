import type { ButtonHTMLAttributes } from "react";

type Variant = "default" | "outline" | "ghost" | "destructive";
type Size = "default" | "xs" | "sm" | "icon-xs" | "icon-sm";

const VARIANTS: Record<Variant, string> = {
  default: "bg-paper text-black hover:bg-white",
  outline: "border-hairline text-paper hover:border-paper",
  ghost: "text-mute hover:text-paper",
  destructive: "border-paper bg-paper text-black",
};

const SIZES: Record<Size, string> = {
  default: "h-8 gap-1.5 px-2.5 text-sm",
  xs: "h-6 gap-1 px-2 text-xs [&_svg]:size-3",
  sm: "h-7 gap-1 px-2.5 text-[0.8rem] [&_svg]:size-3.5",
  "icon-xs": "size-6 [&_svg]:size-3",
  "icon-sm": "size-7 [&_svg]:size-4",
};

export function Button({
  variant = "default",
  size = "default",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type={type}
      className={`inline-flex shrink-0 items-center justify-center border border-transparent whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  );
}
