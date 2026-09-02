import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { api, graphql } from "../lib/api";
import { formatMoney } from "../lib/money";
import type { Dashboard } from "../lib/types";

const DASHBOARD_QUERY = `
  query Dashboard {
    dashboard {
      invoiceCount
      paidTotal
      unpaidTotal
      paidCount
      unpaidCount
      recentInvoices {
        id
        invoiceNumber
        billTo { clientName }
        total
        status
        invoiceDate
      }
    }
  }
`;

type GqlDashboard = {
  dashboard: Omit<Dashboard, "recentInvoices"> & {
    recentInvoices: Array<{
      id: string;
      invoiceNumber: string;
      billTo: { clientName: string };
      total: number;
      status: "UNPAID" | "PAID";
      invoiceDate: string;
    }>;
  };
};

export function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => graphql<GqlDashboard>(DASHBOARD_QUERY),
  });
  const insights = useQuery({
    queryKey: ["insights"],
    queryFn: () => api.dashboardInsights(),
    retry: false,
  });

  if (isLoading) return <p className="text-ink-soft">Loading dashboard…</p>;
  if (isError || !data) return <p className="text-ink-soft">Could not load dashboard totals.</p>;
  const d = data.dashboard;

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          {/* <p className="text-sm text-ink-soft">Totals come from SQL aggregates over PostgreSQL.</p> */}
        </div>
        <Link to="/app/invoices/new">
          <Button>New invoice</Button>
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Invoices" value={String(d.invoiceCount)} />
        <Stat label="Paid" value={formatMoney(d.paidTotal)} />
        <Stat label="Outstanding" value={formatMoney(d.unpaidTotal)} />
      </div>
      {insights.data?.insights && (
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Insights</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {insights.data.insights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}
      <section className="rounded-2xl border border-line bg-white">
        <div className="border-b border-line px-5 py-3 text-sm font-medium">Recent</div>
        {d.recentInvoices.length === 0 && (
          <p className="px-5 py-6 text-sm text-ink-soft">No invoices yet.</p>
        )}
        {d.recentInvoices.map((invoice) => (
          <Link
            key={invoice.id}
            to={`/app/invoices/${invoice.id}`}
            className="flex items-center justify-between border-b border-line px-5 py-3 text-sm last:border-b-0 hover:bg-paper"
          >
            <span>
              {invoice.invoiceNumber} · {invoice.billTo.clientName}
            </span>
            <span>
              {formatMoney(invoice.total)} · {invoice.status}
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
