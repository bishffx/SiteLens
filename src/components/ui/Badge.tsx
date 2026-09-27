import React from "react";
import { clsx } from "clsx";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info" | "outline";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "default",
  size = "sm",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-slate-800 text-slate-300 border-slate-700/80",
    success: "bg-emerald-950/60 text-emerald-400 border-emerald-800/60",
    warning: "bg-amber-950/60 text-amber-400 border-amber-800/60",
    error: "bg-rose-950/60 text-rose-400 border-rose-800/60",
    info: "bg-cyan-950/60 text-cyan-400 border-cyan-800/60",
    outline: "bg-transparent text-slate-400 border-slate-700",
  };

  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5 font-medium tracking-wide",
    md: "text-xs px-2.5 py-1 font-medium",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-md border font-mono uppercase tracking-wider",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
