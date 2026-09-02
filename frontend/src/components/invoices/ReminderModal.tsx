import { useEffect, useState } from "react";
import { Check, Copy, Loader2, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { gmailComposeHref, openComposeTab, openOutlookApp } from "../../lib/mailto";
import { Button } from "../ui/Button";

type Reminder = { subject: string; body: string };

type Props = {
  open: boolean;
  loading: boolean;
  reminder: Reminder | undefined;
  errorMessage?: string;
  recipientEmail: string;
  onClose: () => void;
};

function reminderText(reminder: Reminder) {
  return `${reminder.subject}\n\n${reminder.body}`;
}

export function ReminderModal({
  open,
  loading,
  reminder,
  errorMessage,
  recipientEmail,
  onClose,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [pickingApp, setPickingApp] = useState(false);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setPickingApp(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || loading) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  if (!open) return null;

  const copy = async () => {
    if (!reminder) return;
    try {
      await navigator.clipboard.writeText(reminderText(reminder));
      setCopied(true);
      toast.success("Copied to clipboard");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy. Select the text instead.");
    }
  };

  const openWith = (app: "gmail" | "outlook") => {
    if (!reminder) return;
    if (!recipientEmail.trim()) {
      toast.error("Add the customer's email on the invoice first.");
      return;
    }
    const mail = {
      to: recipientEmail,
      subject: reminder.subject,
      body: reminder.body,
    };
    if (app === "gmail") {
      openComposeTab(gmailComposeHref(mail));
    } else {
      openOutlookApp(mail);
    }
    setPickingApp(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={loading ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reminder-modal-title"
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="reminder-modal-title" className="text-lg font-semibold">
          Payment reminder
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {loading
            ? "Please wait while Gemini drafts the reminder."
            : recipientEmail.trim()
              ? `Ready to send to ${recipientEmail}. Gmail opens in the browser. Outlook opens a new message in your mail app.`
              : "This invoice has no customer email. Add one on the invoice, or copy the draft."}
        </p>

        {loading && !reminder && (
          <div className="mt-6 flex items-center gap-3 text-sm text-ink-soft">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Drafting a reminder with AI…
          </div>
        )}

        {!loading && !reminder && (
          <p className="mt-6 text-sm text-ink-soft">
            {errorMessage || "The draft did not come back. Close and try again."}
          </p>
        )}

        {reminder && (
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-line bg-paper p-4">
              <p className="text-xs uppercase tracking-wide text-ink-soft">To</p>
              <p className="mt-1 text-sm font-medium">
                {recipientEmail.trim() || "No customer email on this invoice"}
              </p>
              <p className="mt-4 text-xs uppercase tracking-wide text-ink-soft">Subject</p>
              <p className="mt-1 text-sm font-medium">{reminder.subject}</p>
              <p className="mt-4 text-xs uppercase tracking-wide text-ink-soft">Body</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{reminder.body}</p>
            </div>
          </div>
        )}

        {pickingApp && reminder && (
          <div className="mt-4 space-y-2 rounded-lg border border-line p-3">
            <p className="text-sm font-medium">Open with</p>
            <Button className="w-full" variant="secondary" onClick={() => openWith("gmail")}>
              Gmail
            </Button>
            <Button className="w-full" variant="secondary" onClick={() => openWith("outlook")}>
              Outlook app
            </Button>
            <Button className="w-full" variant="ghost" onClick={() => setPickingApp(false)}>
              Cancel
            </Button>
          </div>
        )}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Close
          </Button>
          <Button variant="secondary" onClick={() => void copy()} disabled={!reminder || loading}>
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            onClick={() => setPickingApp(true)}
            disabled={!reminder || loading}
          >
            <Mail className="h-4 w-4" aria-hidden />
            Open in email
          </Button>
        </div>
      </div>
    </div>
  );
}
