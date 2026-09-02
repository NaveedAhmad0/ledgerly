import { FormEvent, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { useAuth } from "../context/AuthContext";
import { api, graphql } from "../lib/api";
import { toInvoiceWriteBody } from "../lib/invoiceInput";
import { formatMoney } from "../lib/money";
import type { ExtractedInvoice, Invoice, InvoiceItem } from "../lib/types";

type FormState = {
  invoiceDate: string;
  dueDate: string;
  notes: string;
  paymentTerms: string;
  billFrom: { businessName: string; email: string; address: string; phone: string };
  billTo: { clientName: string; email: string; address: string; phone: string };
  items: InvoiceItem[];
};

const emptyItem = (): InvoiceItem => ({
  description: "",
  quantity: 1,
  unitPrice: 0,
  taxPercent: 19,
});

const INVOICE_QUERY = `
  query Invoice($id: ID!) {
    invoice(id: $id) {
      id
      invoiceNumber
      invoiceDate
      dueDate
      status
      notes
      paymentTerms
      billFrom { businessName email address phone }
      billTo { clientName email address phone }
      items { description quantity unitPrice taxPercent }
    }
  }
`;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function InvoiceFormPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const extracted = (useLocation().state as { extracted?: ExtractedInvoice } | null)?.extracted;
  const isEdit = Boolean(id);

  const existing = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => graphql<{ invoice: Invoice }>(INVOICE_QUERY, { id }),
    enabled: isEdit,
  });

  const [form, setForm] = useState<FormState>(() => ({
    invoiceDate: todayIso(),
    dueDate: todayIso(),
    notes: "",
    paymentTerms: "Net 15",
    billFrom: {
      businessName: user?.businessName || user?.name || "",
      email: user?.email || "",
      address: user?.address || "",
      phone: user?.phone || "",
    },
    billTo: {
      clientName: extracted?.clientName ?? "",
      email: extracted?.email ?? "",
      address: extracted?.address ?? "",
      phone: "",
    },
    items:
      extracted?.items.map((item) => ({
        description: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxPercent: 19,
      })) ?? [emptyItem()],
  }));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit && existing.data?.invoice.status === "PAID") {
      toast.error("Paid invoices cannot be edited.");
      navigate(`/app/invoices/${id}`, { replace: true });
    }
  }, [existing.data, id, isEdit, navigate]);

  useEffect(() => {
    if (!existing.data) return;
    const invoice = existing.data.invoice;
    setForm({
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      notes: invoice.notes ?? "",
      paymentTerms: invoice.paymentTerms,
      billFrom: invoice.billFrom,
      billTo: invoice.billTo,
      items: invoice.items,
    });
  }, [existing.data]);

  const totals = useMemo(() => {
    const subtotal = form.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxTotal = form.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice * (item.taxPercent / 100),
      0,
    );
    return { subtotal, taxTotal, total: subtotal + taxTotal };
  }, [form.items]);

  const updateItem = (index: number, patch: Partial<InvoiceItem>) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (isEdit && id && existing.data) {
        await api.updateInvoice(
          id,
          toInvoiceWriteBody({
            ...existing.data.invoice,
            ...form,
          }),
        );
        toast.success("Invoice updated");
        navigate(`/app/invoices/${id}`);
      } else {
        await api.createInvoice(form);
        toast.success("Invoice saved");
        navigate("/app/invoices");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && existing.isLoading) return <p className="text-ink-soft">Loading invoice…</p>;
  if (isEdit && existing.isError) return <p className="text-ink-soft">Could not load this invoice.</p>;

  return (
    <form className="space-y-6" onSubmit={(e) => void onSubmit(e)}>
      <div>
        <h1 className="text-2xl font-semibold">{isEdit ? "Edit invoice" : "New invoice"}</h1>
        {extracted && (
          <p className="mt-1 text-sm text-copper">
            Draft filled from AI. Review amounts before you save.
          </p>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Invoice date"
          type="date"
          value={form.invoiceDate}
          onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })}
        />
        <Field
          label="Due date"
          type="date"
          value={form.dueDate}
          onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
        />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <fieldset className="space-y-3 rounded-2xl border border-line bg-white p-4">
          <legend className="px-1 text-sm font-medium">From</legend>
          <Field
            label="Business"
            value={form.billFrom.businessName}
            onChange={(e) =>
              setForm({ ...form, billFrom: { ...form.billFrom, businessName: e.target.value } })
            }
          />
          <Field
            label="Email"
            value={form.billFrom.email}
            onChange={(e) =>
              setForm({ ...form, billFrom: { ...form.billFrom, email: e.target.value } })
            }
          />
          <Field
            label="Address"
            value={form.billFrom.address}
            onChange={(e) =>
              setForm({ ...form, billFrom: { ...form.billFrom, address: e.target.value } })
            }
          />
        </fieldset>
        <fieldset className="space-y-3 rounded-2xl border border-line bg-white p-4">
          <legend className="px-1 text-sm font-medium">Bill to</legend>
          <Field
            label="Client"
            value={form.billTo.clientName}
            onChange={(e) =>
              setForm({ ...form, billTo: { ...form.billTo, clientName: e.target.value } })
            }
          />
          <Field
            label="Email"
            value={form.billTo.email}
            onChange={(e) =>
              setForm({ ...form, billTo: { ...form.billTo, email: e.target.value } })
            }
          />
          <Field
            label="Address"
            value={form.billTo.address}
            onChange={(e) =>
              setForm({ ...form, billTo: { ...form.billTo, address: e.target.value } })
            }
          />
        </fieldset>
      </div>
      <div className="space-y-3 rounded-2xl border border-line bg-white p-4">
        {form.items.map((item, index) => (
          <div key={index} className="grid gap-3 md:grid-cols-4">
            <Field
              label="Description"
              value={item.description}
              onChange={(e) => updateItem(index, { description: e.target.value })}
            />
            <Field
              label="Qty"
              type="number"
              min={0.01}
              step="0.01"
              value={item.quantity}
              onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
            />
            <Field
              label="Unit price"
              type="number"
              min={0}
              step="0.01"
              value={item.unitPrice}
              onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })}
            />
            <Field
              label="Tax %"
              type="number"
              min={0}
              value={item.taxPercent}
              onChange={(e) => updateItem(index, { taxPercent: Number(e.target.value) })}
            />
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          onClick={() => setForm({ ...form, items: [...form.items, emptyItem()] })}
        >
          Add line
        </Button>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-soft">
          Subtotal {formatMoney(totals.subtotal)} · Tax {formatMoney(totals.taxTotal)} ·{" "}
          <strong>Total {formatMoney(totals.total)}</strong>
        </p>
        <Button disabled={saving}>{saving ? "Saving…" : isEdit ? "Save changes" : "Save invoice"}</Button>
      </div>
    </form>
  );
}
