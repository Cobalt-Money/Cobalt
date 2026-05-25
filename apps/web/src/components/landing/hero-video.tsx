import { useEffect, useState } from "react";

interface HeroClip {
  label: string;
  mp4?: string;
  webm?: string;
  poster?: string;
}

const CLIPS: HeroClip[] = [
  {
    label: "laptop-nyc",
    mp4: "/landing/hero-video/laptop-nyc.mp4",
    poster: "/landing/hero-video/laptop-nyc-poster.jpg",
  },
];

export function HeroVideo() {
  const [index, setIndex] = useState(0);
  const count = CLIPS.length;
  const clip = CLIPS[index];

  const next = () => setIndex((i) => (i + 1) % count);
  const prev = () => setIndex((i) => (i - 1 + count) % count);

  useEffect(() => {
    if (count <= 1) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        next();
      }
      if (e.key === "ArrowLeft") {
        prev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count]);

  return (
    <div className="absolute inset-0">
      <video
        autoPlay
        className="size-full object-cover object-[60%_50%] sm:object-fill sm:object-center"
        key={clip.label}
        loop
        muted
        playsInline
        poster={clip.poster}
      >
        {clip.webm ? <source src={clip.webm} type="video/webm" /> : null}
        {clip.mp4 ? <source src={clip.mp4} type="video/mp4" /> : null}
      </video>
      {count > 1 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex items-center justify-center gap-4">
          <button
            aria-label="Previous clip"
            className="pointer-events-auto inline-flex size-10 items-center justify-center rounded-full border border-border/60 bg-background/70 text-foreground backdrop-blur transition hover:bg-background"
            onClick={prev}
            type="button"
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M15 18l-6-6 6-6"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </button>
          <div className="pointer-events-auto flex items-center gap-1.5">
            {CLIPS.map((c, i) => (
              <button
                aria-label={`Show ${c.label}`}
                className={`size-1.5 rounded-full transition ${i === index ? "bg-foreground" : "bg-foreground/30 hover:bg-foreground/60"}`}
                key={c.label}
                onClick={() => setIndex(i)}
                type="button"
              />
            ))}
          </div>
          <button
            aria-label="Next clip"
            className="pointer-events-auto inline-flex size-10 items-center justify-center rounded-full border border-border/60 bg-background/70 text-foreground backdrop-blur transition hover:bg-background"
            onClick={next}
            type="button"
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}
