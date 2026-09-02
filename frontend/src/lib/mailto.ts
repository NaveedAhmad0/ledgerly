type ReminderMail = {
  to?: string;
  subject: string;
  body: string;
};

function encoded(mail: ReminderMail) {
  return {
    to: encodeURIComponent(mail.to?.trim() ?? ""),
    subject: encodeURIComponent(mail.subject),
    body: encodeURIComponent(mail.body),
  };
}

export function gmailComposeHref(mail: ReminderMail) {
  const { to, subject, body } = encoded(mail);
  return `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${to}&su=${subject}&body=${body}`;
}

/** mailto is what actually opens a filled New Message in desktop Outlook. */
export function outlookComposeHref(mail: ReminderMail) {
  const to = mail.to?.trim() ?? "";
  const query = [
    `subject=${encodeURIComponent(mail.subject)}`,
    `body=${encodeURIComponent(mail.body)}`,
  ].join("&");
  return to ? `mailto:${to}?${query}` : `mailto:?${query}`;
}

export function openComposeTab(href: string) {
  window.open(href, "_blank", "noopener,noreferrer");
}

export function openOutlookApp(mail: ReminderMail) {
  const link = document.createElement("a");
  link.href = outlookComposeHref(mail);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
