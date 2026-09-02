import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";

export function LandingPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex items-center justify-between">
        <span className="font-semibold">Ledgerly</span>
        <div className="flex gap-2">
          <Link to="/login">
            <Button variant="ghost">Log in</Button>
          </Link>
          <Link to="/register">
            <Button>Create account</Button>
          </Link>
        </div>
      </header>
      <section className="mt-24 max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-copper">
          Invoicing for independent studios
        </p>
        <h1 className="mt-4 text-5xl font-semibold leading-tight">
          Turn messy notes into invoices you can actually stand behind.
        </h1>
        <p className="mt-5 text-lg text-ink-soft">
          React and TypeScript on the surface. PostgreSQL, REST, GraphQL, and tests underneath.
          AI drafts. You approve.
        </p>
        <div className="mt-8 flex gap-3">
          <Link to="/register">
            <Button>Start free</Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary">Use demo account</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
