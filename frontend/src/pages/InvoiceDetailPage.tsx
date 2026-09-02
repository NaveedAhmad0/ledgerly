import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ReminderModal } from "../components/invoices/ReminderModal";
import { Button } from "../components/ui/Button";
import { api, graphql } from "../lib/api";
import { formatMoney } from "../lib/money";
import type { Invoice } from "../lib/types";

const QUERY = `
  query Invoice($id: ID!) {
    invoice(id: $id) {
      id
      invoiceNumber
      invoiceDate
      dueDate
      status
      notes
      paymentTerms
      subtotal
      taxTotal
      total
      billFrom { businessName email address phone }
      billTo { clientName email address phone }
      items { description quantity unitPrice taxPercent lineTotal }
    }
  }
`;

export function InvoiceDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reminderOpen, setReminderOpen] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => graphql<{ invoice: Invoice }>(QUERY, { id }),
  });

  const markPaid = useMutation({
    mutationFn: () => api.updateInvoiceStatus(id, "PAID"),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success("Marked paid");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reminder = useMutation({
    mutationFn: () => api.generateReminder(id),
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) return <p className="text-ink-soft">Loading…</p>;
  if (isError || !data) return <p className="text-ink-soft">Could not load this invoice.</p>;
  const invoice = data.invoice;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/app/invoices" className="text-sm text-ink-soft">
            ← Invoices
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{invoice.invoiceNumber}</h1>
          <p className="text-sm text-ink-soft">
            {invoice.billTo.clientName} · {invoice.status} · Due {invoice.dueDate}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {invoice.status !== "PAID" && (
            <>
              <Link to={`/app/invoices/${id}/edit`}>
                <Button variant="secondary">Edit</Button>
              </Link>
              <Button
                variant="secondary"
                loading={reminder.isPending}
                onClick={() => {
                  reminder.reset();
                  setReminderOpen(true);
                  reminder.mutate();
                }}
              >
                {reminder.isPending ? "Drafting…" : "Draft reminder"}
              </Button>
              <Button onClick={() => markPaid.mutate()}>Mark paid</Button>
            </>
          )}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <PartyCard
          title="From"
          name={invoice.billFrom.businessName}
          email={invoice.billFrom.email}
          address={invoice.billFrom.address}
        />
        <PartyCard
          title="Bill to"
          name={invoice.billTo.clientName}
          email={invoice.billTo.email}
          address={invoice.billTo.address}
        />
      </div>
      <div className="rounded-2xl border border-line bg-white p-6">
        {invoice.items.map((item) => (
          <div
            key={`${item.description}-${item.quantity}-${item.unitPrice}`}
            className="flex justify-between border-b border-line py-2 text-sm"
          >
            <span>
              {item.description} × {item.quantity}
            </span>
            <span>{formatMoney(item.lineTotal ?? item.quantity * item.unitPrice)}</span>
          </div>
        ))}
        <div className="mt-4 space-y-1 text-right text-sm">
          <p className="text-ink-soft">Subtotal {formatMoney(invoice.subtotal)}</p>
          <p className="text-ink-soft">Tax {formatMoney(invoice.taxTotal)}</p>
          <p className="text-lg font-semibold">Total {formatMoney(invoice.total)}</p>
        </div>
      </div>
      {invoice.notes && (
        <p className="text-sm text-ink-soft">Notes: {invoice.notes}</p>
      )}
      <ReminderModal
        open={reminderOpen}
        loading={reminder.isPending}
        reminder={reminder.data}
        errorMessage={reminder.error instanceof Error ? reminder.error.message : undefined}
        recipientEmail={invoice.billTo.email}
        onClose={() => setReminderOpen(false)}
      />
      <Button
        variant="danger"
        onClick={async () => {
          if (!window.confirm("Delete this invoice? This cannot be undone.")) return;
          await api.deleteInvoice(id);
          toast.success("Deleted");
          navigate("/app/invoices");
        }}
      >
        Delete invoice
      </Button>
    </div>
  );
}

function PartyCard({
  title,
  name,
  email,
  address,
}: {
  title: string;
  name: string;
  email: string;
  address: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 text-sm">
      <p className="text-xs uppercase tracking-wide text-ink-soft">{title}</p>
      <p className="mt-2 font-medium">{name}</p>
      {email && <p className="text-ink-soft">{email}</p>}
      {address && <p className="text-ink-soft">{address}</p>}
    </div>
  );
}
