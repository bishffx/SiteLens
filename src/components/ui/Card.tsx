import React from "react";
import { clsx } from "clsx";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export function Card({
  className,
  hoverEffect = false,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm transition-all duration-200",
        hoverEffect && "hover:border-slate-700 hover:bg-slate-900/90 hover:shadow-lg hover:shadow-cyan-950/10",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
