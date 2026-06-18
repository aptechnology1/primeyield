import { Link } from "@tanstack/react-router";

export function BrandMark({ name = "HORIZON" }: { name?: string }) {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="size-7 bg-primary rounded flex items-center justify-center overflow-hidden">
        <div className="w-1 h-3 bg-white/40 -rotate-12 rounded-full" />
        <div className="w-1 h-4 bg-white rotate-12 rounded-full -ml-0.5" />
      </div>
      <span className="font-bold tracking-tight text-lg text-foreground">{name.toUpperCase()}</span>
    </Link>
  );
}
