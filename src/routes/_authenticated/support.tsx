import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getSupportInfo } from "@/lib/user.functions";
import { Button } from "@/components/ui/button";
import { LifeBuoy, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/support")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["support-info"], queryFn: () => (getSupportInfo as any)() }),
  component: SupportPage,
  head: () => ({ meta: [{ title: "Support — PrimeYield" }] }),
});

type Contact = { name: string; details?: string; link?: string };

function SupportPage() {
  const fetchInfo = useServerFn(getSupportInfo);
  const { data } = useSuspenseQuery({ queryKey: ["support-info"], queryFn: () => fetchInfo() });

  const title = (data as any)?.support_title || "Support";
  const legacy: Contact | null = ((data as any)?.support_agent_name ||
    (data as any)?.support_agent_details ||
    (data as any)?.support_contact_link)
    ? {
        name: (data as any)?.support_agent_name || "Support",
        details: (data as any)?.support_agent_details || "",
        link: (data as any)?.support_contact_link || "",
      }
    : null;
  const list: Contact[] = Array.isArray((data as any)?.support_contacts) ? (data as any).support_contacts : [];
  const contacts: Contact[] = list.length ? list : legacy ? [legacy] : [];

  return (
    <div className="px-5 pt-6 pb-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="size-11 rounded-full bg-primary-soft border border-primary/20 flex items-center justify-center">
          <LifeBuoy className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-xs text-muted-foreground">We're here to help.</p>
        </div>
      </header>

      {contacts.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Support details haven't been added yet. Please check back soon.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((c, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Contact</p>
                <p className="text-base font-bold mt-1">{c.name}</p>
              </div>
              {c.details && (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{c.details}</p>
              )}
              {c.link && (
                <a href={c.link} target="_blank" rel="noopener noreferrer" className="block">
                  <Button className="w-full h-11">
                    <ExternalLink className="size-4 mr-2" /> Contact now
                  </Button>
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
