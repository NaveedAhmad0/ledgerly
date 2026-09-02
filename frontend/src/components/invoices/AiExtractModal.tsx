import { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { Button } from "../ui/Button";

type Props = { open: boolean; onClose: () => void };

export function AiExtractModal({ open, onClose }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!open) return null;

  const submit = async () => {
    setLoading(true);
    try {
      const extracted = await api.parseInvoiceText(text);
      toast.success("Extracted. Review before saving — nothing was written yet.");
      onClose();
      navigate("/app/invoices/new", { state: { extracted } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Extraction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Extract from notes</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Paste an email or messy notes. Gemini proposes a draft. You confirm it before it hits
          PostgreSQL.
        </p>
        <textarea
          className="mt-4 h-40 w-full rounded-lg border border-line p-3 text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Invoice Helix Publishing for 5 hours of API work at €150/hour..."
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={loading || text.trim().length < 12}>
            {loading ? "Extracting…" : "Extract draft"}
          </Button>
        </div>
      </div>
    </div>
  );
}
