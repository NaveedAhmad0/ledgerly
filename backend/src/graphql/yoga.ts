import { createSchema, createYoga } from "graphql-yoga";
import { InvoiceStatus } from "@prisma/client";
import { userFromToken } from "../middleware/auth";
import { AppError } from "../lib/errors";
import * as invoiceService from "../modules/invoices/invoice.service";
import * as authService from "../modules/auth/auth.service";

const typeDefs = /* GraphQL */ `
  enum InvoiceStatus {
    UNPAID
    PAID
  }

  type User {
    id: ID!
    name: String!
    email: String!
    businessName: String
    address: String
    phone: String
  }

  type InvoiceItem {
    id: ID
    description: String!
    quantity: Float!
    unitPrice: Float!
    taxPercent: Float!
    lineTotal: Float
  }

  type Party {
    businessName: String
    clientName: String
    email: String
    address: String
    phone: String
  }

  type Invoice {
    id: ID!
    invoiceNumber: String!
    invoiceDate: String!
    dueDate: String!
    status: InvoiceStatus!
    notes: String
    paymentTerms: String
    currency: String!
    billFrom: Party!
    billTo: Party!
    items: [InvoiceItem!]!
    subtotal: Float!
    taxTotal: Float!
    total: Float!
  }

  type Dashboard {
    invoiceCount: Int!
    paidTotal: Float!
    unpaidTotal: Float!
    paidCount: Int!
    unpaidCount: Int!
    recentInvoices: [Invoice!]!
  }

  type Query {
    me: User!
    invoices(status: InvoiceStatus): [Invoice!]!
    invoice(id: ID!): Invoice!
    dashboard: Dashboard!
  }
`;

async function requireUser(request: Request) {
  const user = await userFromToken(request.headers.get("authorization") ?? undefined);
  if (!user) throw new AppError(401, "Not authorized");
  return user;
}

export const yoga = createYoga({
  graphqlEndpoint: "/graphql",
  maskedErrors: process.env.NODE_ENV === "production",
  schema: createSchema({
    typeDefs,
    resolvers: {
      Query: {
        me: async (_: unknown, __: unknown, ctx: { request: Request }) => {
          const user = await requireUser(ctx.request);
          return authService.getProfile(user.id);
        },
        invoices: async (
          _: unknown,
          args: { status?: InvoiceStatus },
          ctx: { request: Request },
        ) => {
          const user = await requireUser(ctx.request);
          return invoiceService.listInvoices(user.id, args.status);
        },
        invoice: async (_: unknown, args: { id: string }, ctx: { request: Request }) => {
          const user = await requireUser(ctx.request);
          return invoiceService.getInvoice(user.id, args.id);
        },
        dashboard: async (_: unknown, __: unknown, ctx: { request: Request }) => {
          const user = await requireUser(ctx.request);
          return invoiceService.dashboardStats(user.id);
        },
      },
    },
  }),
});
