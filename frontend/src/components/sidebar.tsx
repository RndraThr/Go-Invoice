"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    FileText,
    Receipt,
    Users,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

const navItems = [
    { href: "/", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/projects", icon: FileText, label: "Projects/PO" },
    { href: "/invoices", icon: FileText, label: "Invoices" },
    { href: "/kwitansi", icon: Receipt, label: "Kwitansi" },
    { href: "/users", icon: Users, label: "Users" },
];

function KSMLogo({ collapsed }: { collapsed: boolean }) {
    return (
        <div className="flex items-center gap-3 px-3 py-6">
            <img
                src="/ksmlogo.png"
                alt="KSM Logo"
                className="h-14 w-14 shrink-0 rounded-xl object-contain drop-shadow-md"
            />
            {!collapsed && (
                <div className="flex flex-col justify-center overflow-hidden">
                    <span className="gold-text text-sm font-bold tracking-wider leading-tight">
                        KSM INVOICE
                    </span>
                    <span className="text-[10px] text-sidebar-foreground/60 tracking-wider mt-0.5">
                        PT Kian Santang Muliatama
                    </span>
                </div>
            )}
        </div>
    );
}

function NavLink({
    href,
    icon: Icon,
    label,
    collapsed,
    active,
}: {
    href: string;
    icon: any;
    label: string;
    collapsed: boolean;
    active: boolean;
}) {
    return (
        <Link
            href={href}
            className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                    ? "bg-gold-400/10 text-gold-400 shadow-sm border border-gold-400/20"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
        >
            <Icon className={cn("h-5 w-5 shrink-0", active && "text-gold-400")} />
            {!collapsed && <span>{label}</span>}
        </Link>
    );
}

export function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const { logout } = useAuth();

    return (
        <aside
            className={cn(
                "hidden md:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 relative",
                collapsed ? "w-[72px]" : "w-64"
            )}
        >
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-50 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background shadow-md hover:border-gold-400 hover:text-gold-500 transition-all duration-200"
            >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>

            <KSMLogo collapsed={collapsed} />
            <Separator className="bg-sidebar-border" />

            <nav className="flex-1 space-y-1 px-3 py-4">
                {navItems.map((item) => (
                    <NavLink
                        key={item.href}
                        {...item}
                        collapsed={collapsed}
                        active={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)}
                    />
                ))}
            </nav>

            <Separator className="bg-sidebar-border" />

            <div className="px-3 py-3">
                <button
                    onClick={logout}
                    className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                    <LogOut className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>Logout</span>}
                </button>
            </div>
        </aside>
    );
}

export function MobileSidebar() {
    const pathname = usePathname();
    const { logout } = useAuth();

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar border-sidebar-border p-0 flex flex-col">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <KSMLogo collapsed={false} />
                <Separator className="bg-sidebar-border" />
                <nav className="space-y-1 px-3 py-4 flex-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.href}
                            {...item}
                            collapsed={false}
                            active={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)}
                        />
                    ))}
                </nav>
                <Separator className="bg-sidebar-border" />
                <div className="p-3 mt-auto">
                    <button
                        onClick={logout}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    >
                        <LogOut className="h-5 w-5 shrink-0" />
                        <span>Logout</span>
                    </button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
