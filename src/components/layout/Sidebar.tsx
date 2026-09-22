"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  Receipt,
  CreditCard,
  PieChart,
  Settings,
  LogOut,
  PlusCircle,
  Building2,
  X,
} from "lucide-react";
import { clsx } from "clsx";

interface SidebarProps {
  organization: {
    id: string;
    name: string;
    businessType: string;
    gstEnabled: boolean;
  } | null;
  user: {
    name: string;
    email: string;
  } | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ organization, user, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Quick Bill", href: "/billing/new", icon: PlusCircle, highlight: true },
    { label: "Customers", href: "/customers", icon: Users },
    { label: "Products & Services", href: "/items", icon: Package },
    { label: "Invoices", href: "/invoices", icon: Receipt },
    { label: "Expenses", href: "/expenses", icon: CreditCard },
    { label: "Reports", href: "/reports", icon: PieChart },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          "fixed top-0 bottom-0 left-0 z-40 w-60 bg-white text-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 border-r border-slate-200",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">
              B
            </div>
            <span className="font-semibold text-sm tracking-tight text-slate-900">BizFlow</span>
          </Link>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden text-slate-400 hover:text-slate-700 p-1 rounded-md"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="px-4 py-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-500">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="truncate flex-1">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {organization?.name || "My Business"}
              </p>
              <p className="text-[11px] text-slate-500 capitalize">
                {organization?.businessType?.toLowerCase() || "Business"}
                {organization?.gstEnabled && " · GST"}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  item.highlight && !isActive
                    ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                    : isActive
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon className={clsx("w-4 h-4", isActive ? "text-white" : item.highlight ? "text-indigo-600" : "text-slate-400")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-3 border-t border-slate-200 shrink-0">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
            <div className="truncate pr-2">
              <p className="text-xs font-semibold text-slate-900 truncate">{user?.name || "Owner"}</p>
              <p className="text-[11px] text-slate-500 truncate">{user?.email || ""}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-white transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
