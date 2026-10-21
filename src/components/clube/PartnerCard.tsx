import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

import { PartnerLogo } from "./PartnerLogo";
import { isNew } from "@/lib/categories";
import { ContentIcon } from "./ContentIcon";
import type { PublicPartner } from "@/lib/partners.functions";

export function PartnerCard({ partner }: { partner: PublicPartner }) {

  return (
    <Link
      to="/parceiro/$slug"
      params={{ slug: partner.slug }}
      className="glass-card group flex flex-col gap-4 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50"
    >
      <div className="flex items-start gap-4">
        <PartnerLogo name={partner.name} logoUrl={partner.logo_url} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-base font-semibold">{partner.name}</h3>
            {isNew(partner.created_at) ? (
              <span className="gradient-gold shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-accent-foreground">
                Nova
              </span>
            ) : null}
          </div>
          {partner.category_name ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ContentIcon name={partner.category_icon} className="h-3.5 w-3.5 text-accent" />
              {partner.category_name}
            </p>
          ) : null}
        </div>
      </div>

      <p className="line-clamp-2 text-sm text-muted-foreground">{partner.summary}</p>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/70 pt-4">
        <span className="font-display text-lg font-bold text-gradient">{partner.discount}</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground transition-colors group-hover:text-primary">
          Ver detalhes
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
