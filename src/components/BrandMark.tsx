import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/lib/user.functions";

export function BrandMark({ name }: { name?: string }) {
  const { data } = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => getPublicSettings(),
    staleTime: 60_000,
    enabled: !name,
  });
  const label = (name ?? data?.site_name ?? "PrimeYield") as string;
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="size-7 bg-primary rounded flex items-center justify-center overflow-hidden">
        <div className="w-1 h-3 bg-white/40 -rotate-12 rounded-full" />
        <div className="w-1 h-4 bg-white rotate-12 rounded-full -ml-0.5" />
      </div>
      <span className="font-bold tracking-tight text-lg text-foreground">{label.toUpperCase()}</span>
    </Link>
  );
}
