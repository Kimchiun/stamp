import { GraffitiBackdrop } from "@/components/GraffitiBackdrop";
import { HeroWall } from "@/components/HeroWall";
import { TearRail } from "@/components/TearRail";
import { MintWizard } from "@/components/MintWizard";

export default function Home() {
  return (
    <main className="relative flex-1 overflow-x-hidden">
      <GraffitiBackdrop />

      <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-4 pt-5 md:px-8 md:pt-7">
        <p
          className="tag-stamp text-sm tracking-wide text-[var(--cream)] md:text-base"
          style={{ textShadow: "2px 2px 0 var(--pink)", WebkitTextStroke: "0" }}
        >
          STAMP
        </p>
        <p className="xerox-label text-[var(--lime)]">12 chains · one sheet</p>
      </header>

      <div className="relative z-10">
        <HeroWall />
        <TearRail />
      </div>

      <section
        id="mint"
        className="relative z-10 border-t-4 border-[var(--lime)] px-4 py-14 md:px-8 md:py-20"
      >
        <div className="mx-auto mb-10 max-w-6xl">
          <p className="xerox-label text-[var(--lime)]">Tear here · mint flow</p>
          <h2
            className="tag-stamp mt-2 text-5xl text-[var(--cream)] md:text-7xl"
            style={{ textShadow: "4px 4px 0 var(--pink)", WebkitTextStroke: "0" }}
          >
            찍기
          </h2>
        </div>
        <MintWizard />
      </section>

      <footer className="relative z-10 border-t-2 border-[var(--pink)] px-4 py-8 text-center md:px-8">
        <p className="xerox-label text-[var(--cream)]/60">
          STAMP · EVM은 공유 컬렉션에 민트합니다. 이미지·메타는 공개 HTTPS
          도메인(앱 또는 S3/R2 CDN)에 올립니다.
        </p>
      </footer>
    </main>
  );
}
