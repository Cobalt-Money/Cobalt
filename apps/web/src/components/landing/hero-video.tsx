interface HeroClip {
  label: string;
  mp4?: string;
  webm?: string;
  poster?: string;
}

const CLIP: HeroClip = {
  label: "laptop-nyc",
  mp4: "/landing/hero-video/laptop-nyc.mp4",
  poster: "/landing/hero-video/laptop-nyc-poster.jpg",
};

export function HeroVideo() {
  return (
    <div className="absolute inset-0">
      <video
        autoPlay
        className="size-full object-cover object-[60%_50%] sm:object-fill sm:object-center"
        loop
        muted
        playsInline
        poster={CLIP.poster}
      >
        {CLIP.webm ? <source src={CLIP.webm} type="video/webm" /> : null}
        {CLIP.mp4 ? <source src={CLIP.mp4} type="video/mp4" /> : null}
      </video>
    </div>
  );
}
