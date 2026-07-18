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
  const label = (name ?? data?.site_name ?? "PRIMEMACH").toUpperCase();
  return (
    <Link to="/" className="flex items-center gap-3">
      {/* Inline industrial machine-style logo (gear + hazard panel) */}
      <svg className="w-8 h-8" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="var(--primary)" />
            <stop offset="1" stopColor="var(--primary-soft)" />
          </linearGradient>
        </defs>
        <g fill="none" fillRule="evenodd">
          <circle cx="32" cy="32" r="30" fill="var(--card)" stroke="var(--border)" strokeWidth="1" />
          <g transform="translate(12,12)">
            <path d="M20 0 L24 6 L32 8 L28 14 L30 22 L22 20 L14 22 L16 14 L12 8 L20 6 Z" fill="url(#g1)" transform="translate(0,6) scale(0.9)"/>
            <rect x="9" y="24" width="14" height="6" rx="1" fill="var(--accent)" />
          </g>
        </g>
      </svg>
      <span className="font-bold tracking-tight text-lg text-foreground select-none">{label}</span>
    </Link>
  );
}
