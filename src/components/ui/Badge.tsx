import React from "react";
import { clsx } from "clsx";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "neutral"
    | "product"
    | "service";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "default",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-slate-100 text-slate-800 border-slate-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    info: "bg-sky-50 text-sky-700 border-sky-200",
    neutral: "bg-gray-100 text-gray-700 border-gray-200",
    product: "bg-slate-900 text-white border-slate-900",
    service: "bg-slate-100 text-slate-900 border-slate-300",
  };

  const sizeStyles = {
    sm: "text-[11px] px-1.5 py-0.5",
    md: "text-xs px-2.5 py-0.5",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center font-medium rounded-full border",
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

export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "PAID":
      return <Badge variant="success">Paid</Badge>;
    case "PARTIALLY_PAID":
      return <Badge variant="warning">Partially Paid</Badge>;
    case "ISSUED":
      return <Badge variant="info">Issued</Badge>;
    case "DRAFT":
      return <Badge variant="neutral">Draft</Badge>;
    case "CANCELLED":
      return <Badge variant="danger">Cancelled</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
}
