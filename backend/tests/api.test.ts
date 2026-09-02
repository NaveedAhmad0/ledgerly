import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../src/app";

const prisma = new PrismaClient();
const app = createApp();
const email = `qa-${Date.now()}@ledgerly.test`;

async function databaseIsUp() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

describe("API", () => {
  let ready = false;

  beforeAll(async () => {
    ready = await databaseIsUp();
    if (!ready) {
      console.warn("Skipping API integration tests — PostgreSQL is not running.");
    }
  });

  afterAll(async () => {
    if (ready) {
      await prisma.user.deleteMany({ where: { email } });
    }
    await prisma.$disconnect();
  });

  it("registers, authenticates, and isolates invoice data", async () => {
    if (!ready) return;
    const register = await request(app).post("/api/auth/register").send({
      name: "QA User",
      email,
      password: "Password12$",
    });
    expect(register.status).toBe(201);
    const token = register.body.token as string;

    const created = await request(app)
      .post("/api/invoices")
      .set("Authorization", `Bearer ${token}`)
      .send({
        invoiceDate: "2026-09-01",
        dueDate: "2026-09-15",
        billFrom: {
          businessName: "QA Studio",
          email,
        },
        billTo: {
          clientName: "Helix GmbH",
          email: "ap@helix.test",
        },
        items: [{ description: "API work", quantity: 2, unitPrice: 100, taxPercent: 19 }],
      });

    expect(created.status).toBe(201);
    expect(created.body.total).toBe(238);
    expect(created.body.invoiceNumber).toMatch(/^INV-2026-/);

    const graphql = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send({
        query: `query { dashboard { invoiceCount unpaidTotal recentInvoices { invoiceNumber total } } }`,
      });

    expect(graphql.status).toBe(200);
    expect(graphql.body.data.dashboard.invoiceCount).toBe(1);
    expect(graphql.body.data.dashboard.unpaidTotal).toBe(238);

    const paid = await request(app)
      .patch(`/api/invoices/${created.body.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "PAID" });
    expect(paid.status).toBe(200);
    expect(paid.body.status).toBe("PAID");

    const otherEmail = `qa-other-${Date.now()}@ledgerly.test`;
    const other = await request(app).post("/api/auth/register").send({
      name: "Other Org",
      email: otherEmail,
      password: "Password12$",
    });
    expect(other.status).toBe(201);

    const sneak = await request(app)
      .get(`/api/invoices/${created.body.id}`)
      .set("Authorization", `Bearer ${other.body.token}`);
    expect(sneak.status).toBe(404);

    const otherGraphql = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${other.body.token}`)
      .send({ query: `query { invoices { id } dashboard { invoiceCount } }` });
    expect(otherGraphql.body.data.invoices).toEqual([]);
    expect(otherGraphql.body.data.dashboard.invoiceCount).toBe(0);

    await prisma.user.deleteMany({ where: { email: otherEmail } });
  });

  it("rejects GraphQL reads without a token", async () => {
    const res = await request(app)
      .post("/graphql")
      .send({ query: `query { me { email } }` });
    expect(res.status).toBe(200);
    expect(res.body.errors?.[0].message).toMatch(/not authorized/i);
  });

  it("rejects login with missing credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "not-an-email",
      password: "",
    });
    expect(res.status).toBe(400);
  });
});
