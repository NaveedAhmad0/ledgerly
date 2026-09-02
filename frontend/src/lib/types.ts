export type User = {
  id: string;
  name: string;
  email: string;
  businessName: string;
  address: string;
  phone: string;
};

export type InvoiceItem = {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
  lineTotal?: number;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: "UNPAID" | "PAID";
  notes: string;
  paymentTerms: string;
  currency: string;
  billFrom: {
    businessName: string;
    email: string;
    address: string;
    phone: string;
  };
  billTo: {
    clientName: string;
    email: string;
    address: string;
    phone: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
};

export type Dashboard = {
  invoiceCount: number;
  paidTotal: number;
  unpaidTotal: number;
  paidCount: number;
  unpaidCount: number;
  recentInvoices: Invoice[];
};

export type ExtractedInvoice = {
  clientName: string;
  email: string;
  address: string;
  items: { name: string; quantity: number; unitPrice: number }[];
};
