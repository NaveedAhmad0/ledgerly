import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AiExtractModal } from "../components/invoices/AiExtractModal";
import { Button } from "../components/ui/Button";
import { graphql } from "../lib/api";
import { formatMoney } from "../lib/money";
import type { Invoice } from "../lib/types";

const QUERY = `
  query Invoices($status: InvoiceStatus) {
    invoices(status: $status) {
      id
      invoiceNumber
      invoiceDate
      dueDate
      status
      total
      billTo { clientName }
    }
  }
`;

export function InvoicesPage() {
  const [aiOpen, setAiOpen] = useState(false);
  const [status, setStatus] = useState<"" | "PAID" | "UNPAID">("");
  const { data, isLoading } = useQuery({
    queryKey: ["invoices", status],
    queryFn: () =>
      graphql<{ invoices: Invoice[] }>(QUERY, status ? { status } : {}),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setAiOpen(true)}>
            Extract with AI
          </Button>
          <Link to="/app/invoices/new">
            <Button>New invoice</Button>
          </Link>
        </div>
      </div>
      <div className="flex gap-2">
        {(["", "UNPAID", "PAID"] as const).map((value) => (
          <button
            key={value || "all"}
            onClick={() => setStatus(value)}
            className={`rounded-full px-3 py-1 text-sm ${
              status === value ? "bg-ink text-white" : "bg-white border border-line"
            }`}
          >
            {value || "All"}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {isLoading && <p className="p-5 text-sm text-ink-soft">Loading…</p>}
        {!isLoading && data?.invoices.length === 0 && (
          <p className="p-5 text-sm text-ink-soft">No invoices in this filter yet.</p>
        )}
        {data?.invoices.map((invoice) => (
          <Link
            key={invoice.id}
            to={`/app/invoices/${invoice.id}`}
            className="grid grid-cols-2 gap-2 border-b border-line px-5 py-3 text-sm last:border-b-0 hover:bg-paper md:grid-cols-5"
          >
            <span className="font-medium">{invoice.invoiceNumber}</span>
            <span>{invoice.billTo.clientName}</span>
            <span className="hidden md:block">{invoice.invoiceDate}</span>
            <span>{formatMoney(invoice.total)}</span>
            <span>{invoice.status}</span>
          </Link>
        ))}
      </div>
      <AiExtractModal open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}
