import { cn } from "@/lib/utils";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const words = parts.filter((part) => part.length > 2);
  const source = words.length > 0 ? words : parts;
  return source
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function PartnerLogo({
  name,
  logoUrl,
  className,
  size = "md",
}: {
  name: string;
  logoUrl?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes =
    size === "lg"
      ? "h-24 w-24 text-2xl"
      : size === "sm"
        ? "h-11 w-11 text-sm"
        : "h-14 w-14 text-base";

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`Logo ${name}`}
        loading="lazy"
        className={cn(
          "shrink-0 rounded-xl border border-border bg-secondary object-contain p-1.5",
          sizes,
          className,
        )}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`Logo ${name}`}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl border border-border bg-gradient-to-br from-primary to-accent font-display font-black uppercase tracking-wide text-primary-foreground shadow-sm",
        sizes,
        className,
      )}
    >
      {initials(name) || name.slice(0, 2).toUpperCase() || "CR"}
    </div>
  );
}
