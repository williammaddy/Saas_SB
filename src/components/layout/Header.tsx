"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
  actions?: React.ReactNode;
}

export function Header({ title, onMenuClick, actions }: HeaderProps) {
  const pathname = usePathname();
  const showNewBill = pathname !== "/billing/new";
  return (
    <header className="h-14 bg-white/90 backdrop-blur border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-base font-semibold text-slate-900 tracking-tight truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {actions}
        {showNewBill && (
          <Link href="/billing/new">
            <Button size="sm" icon={<PlusCircle className="w-4 h-4" />}>
              New bill
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
