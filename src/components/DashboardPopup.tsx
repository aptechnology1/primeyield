import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Button = { title: string; link: string };

export function DashboardPopup({
  enabled,
  title,
  message,
  buttons,
}: {
  enabled: boolean;
  title: string;
  message: string;
  buttons: Button[];
}) {
  const [open, setOpen] = useState(false);

  // Hash the content so a NEW message re-opens even if dismissed previously this session.
  const sig = `${title}\u0001${message}\u0001${(buttons ?? [])
    .map((b) => `${b.title}=>${b.link}`)
    .join("|")}`;

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (!title && !message && (!buttons || buttons.length === 0)) return;
    const key = "horizon_popup_sig";
    if (sessionStorage.getItem(key) === sig) return;
    sessionStorage.setItem(key, sig);
    setOpen(true);
  }, [enabled, sig, title, message, buttons]);

  if (!enabled) return null;

  const isExternal = (href: string) => /^https?:\/\//i.test(href);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{title || "Notice"}</DialogTitle>
          {message && (
            <DialogDescription className="whitespace-pre-wrap text-sm text-muted-foreground pt-1">
              {message}
            </DialogDescription>
          )}
        </DialogHeader>
        {buttons && buttons.length > 0 && (
          <div className="flex flex-col gap-2 pt-2">
            {buttons.map((b, i) =>
              isExternal(b.link) ? (
                <a
                  key={i}
                  href={b.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="w-full h-10 inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
                >
                  {b.title}
                </a>
              ) : (
                <a
                  key={i}
                  href={b.link}
                  onClick={() => setOpen(false)}
                  className="w-full h-10 inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
                >
                  {b.title}
                </a>
              ),
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
