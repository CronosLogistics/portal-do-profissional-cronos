import { useEffect, useState, type ReactNode } from "react";

import heroMp4 from "@/assets/cronos-hero.mp4.asset.json";
import heroWebm from "@/assets/cronos-hero.webm.asset.json";
import heroPoster from "@/assets/cronos-hero-poster.jpg.asset.json";

export function HeroVideo({ children }: { children: ReactNode }) {
  const [playVideo, setPlayVideo] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.matchMedia("(max-width: 767px)").matches;
    setPlayVideo(!reduced && !small);
  }, []);

  return (
    <section className="relative isolate overflow-hidden px-4 pb-16 pt-20">
      <div className="absolute inset-0 -z-10">
        {playVideo ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={heroPoster.url}
            aria-hidden="true"
            className="h-full w-full object-cover"
          >
            <source src={heroWebm.url} type="video/webm" />
            <source src={heroMp4.url} type="video/mp4" />
          </video>
        ) : (
          <img
            src={heroPoster.url}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover"
          />
        )}

        {/* Camada de cor da marca para manter o texto legível */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in oklab, var(--background) 72%, transparent) 0%, color-mix(in oklab, var(--background) 78%, transparent) 45%, var(--background) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 65% 60% at 20% 10%, color-mix(in oklab, var(--primary) 32%, transparent), transparent 65%)",
          }}
        />
      </div>

      {children}
    </section>
  );
}
