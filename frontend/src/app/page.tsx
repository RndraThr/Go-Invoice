"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  FileText,
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  Plus,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { toast } from "sonner";

interface DashboardStats {
  total_invoices: number;
  total_draft: number;
  total_review: number;
  total_approved: number;
  total_paid: number;
  total_revenue: number;
  total_outstanding: number;
  overdue_count: number;
}

interface Invoice {
  id: number;
  invoice_number: string;
  client_name: string;
  grand_total: number;
  status: string;
  invoice_date: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  review: { label: "In Review", variant: "outline" },
  approved: { label: "Approved", variant: "default" },
  sent: { label: "Sent", variant: "default" },
  paid: { label: "Paid", variant: "default" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export default function DashboardPage() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Fetch stats
        const statsRes = await fetch(`${API_URL}/api/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const statsData = await statsRes.json();

        // Fetch recent invoices
        const invRes = await fetch(`${API_URL}/api/invoices?limit=5`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const invData = await invRes.json();

        if (statsData.success) setStats(statsData.data);
        if (invData.success) setRecentInvoices(invData.data);

      } catch (err) {
        toast.error("Gagal memuat data dashboard");
        console.error("Dashboard fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gold-400" />
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Invoices",
      value: stats.total_invoices.toString(),
      change: "All time",
      icon: FileText,
      color: "text-gold-400",
      bgColor: "bg-gold-400/10",
      changeColor: "text-muted-foreground",
    },
    {
      label: "Total Revenue (Paid)",
      value: formatCurrency(stats.total_revenue),
      change: `${stats.total_paid} paid invoices`,
      icon: DollarSign,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      changeColor: "text-emerald-500",
    },
    {
      label: "Outstanding",
      value: formatCurrency(stats.total_outstanding),
      change: "Pending payment",
      icon: Clock,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      changeColor: "text-blue-500",
    },
    {
      label: "Overdue",
      value: stats.overdue_count.toString(),
      change: "Action needed",
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      changeColor: "text-red-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Selamat datang kembali, {user?.name}
          </p>
        </div>
        <Link href="/invoices/create">
          <Button className="gold-gradient text-white shadow-lg shadow-gold-400/25 hover:shadow-gold-400/40 transition-shadow">
            <Plus className="mr-2 h-4 w-4" />
            Invoice Baru
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card
            key={stat.label}
            className="glass-card hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <div className="flex items-center gap-1 text-xs">
                    <TrendingUp className={`h-3 w-3 ${stat.changeColor}`} />
                    <span className={stat.changeColor}>{stat.change}</span>
                  </div>
                </div>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bgColor}`}
                >
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Invoices */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Invoice Terbaru</CardTitle>
          <Link href="/invoices">
            <Button variant="ghost" size="sm" className="text-gold-400 hover:text-gold-500">
              Lihat Semua
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentInvoices.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Belum ada invoice yang dibuat.
            </div>
          ) : (
            <div className="space-y-3">
              {recentInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-border/50 p-3 hover:bg-muted/30 transition-colors gap-3 sm:gap-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-400/10 shrink-0">
                      <FileText className="h-4 w-4 text-gold-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{inv.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {inv.client_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 justify-between sm:justify-end">
                    <span className="text-sm font-medium">
                      {formatCurrency(inv.grand_total)}
                    </span>
                    <Badge
                      variant={statusConfig[inv.status]?.variant || "secondary"}
                      className={
                        inv.status === "paid"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : inv.status === "approved"
                            ? "bg-gold-400/10 text-gold-500 dark:text-gold-400 border-gold-400/20"
                            : inv.status === "sent"
                              ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                              : ""
                      }
                    >
                      {statusConfig[inv.status]?.label || inv.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
