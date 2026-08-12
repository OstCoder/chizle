import Link from "next/link";
import {
  ArrowRight,
  Camera,
  GitCompareArrows,
  Sparkles,
  ScanFace,
  ShieldCheck,
  Wand2,
} from "lucide-react";

const capabilities = [
  {
    title: "Analyze a photo",
    desc: "Get symmetry, ratios, posture, expression, and hair reads — with fixes ordered from now to long-term.",
    href: "/analyze",
    icon: Camera,
    accent: "from-accent-500/20 to-accent-500/0",
  },
  {
    title: "Then vs Now",
    desc: "Compare two photos and surface the measurable improvements — and what still needs work.",
    href: "/compare",
    icon: GitCompareArrows,
    accent: "from-sky-500/20 to-sky-500/0",
  },
  {
    title: "Dating profile scorecard",
    desc: "Score a photo for a dating app or for real life — lighting, filters, grooming, and presence with a verdict and tips.",
    href: "/scorecard",
    icon: Sparkles,
    accent: "from-pink-500/20 to-pink-500/0",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-16">
      <section className="relative -mx-6 -mt-10 overflow-hidden bg-grid-fade px-6 pb-20 pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-wider text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
            Objective · private · in-browser
          </div>
          <h1 className="text-balance text-5xl font-semibold tracking-tight md:text-6xl">
            See yourself through{" "}
            <span className="bg-gradient-to-br from-accent-300 to-accent-600 bg-clip-text text-transparent">
              clearer eyes.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-lg leading-relaxed text-white/60">
            Upload a photo. Chizle maps your features, scores symmetry, ratios,
            posture, and expression, then hands you a list of practical,
            non-invasive tweaks. No filters, no faking — just honest feedback.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/analyze" className="btn-primary">
              <ScanFace className="h-4 w-4" />
              Analyze a photo <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/scorecard" className="btn-secondary">
              <Sparkles className="h-4 w-4" />
              Run a scorecard
            </Link>
          </div>
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-white/40">
            <ShieldCheck className="h-3.5 w-3.5" />
            Runs on-device with MediaPipe. No uploads, no accounts.
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-sm font-medium uppercase tracking-wider text-white/40">
          Three things it does
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {capabilities.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group card relative overflow-hidden p-6 transition-transform hover:-translate-y-0.5"
            >
              <div
                className={`pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br ${c.accent} opacity-60`}
              />
              <div className="relative">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-white/80">
                  <c.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">
                  {c.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/55">
                  {c.desc}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm text-accent-400 opacity-0 transition-opacity group-hover:opacity-100">
                  Open <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <Pillar
          icon={Wand2}
          title="Actionable, not aesthetic"
          body="Every weakspot is paired with a practical habit, posture cue, or style fix. No surgical advice, no harsh judgment."
        />
        <Pillar
          icon={ScanFace}
          title="468 landmarks, one report"
          body="MediaPipe FaceMesh maps your face into 468 points. We turn that into symmetry, ratio, and posture scores you can trust."
        />
        <Pillar
          icon={ShieldCheck}
          title="Private by design"
          body="Everything runs in your browser. The image never leaves the device. No accounts, no telemetry, no uploads."
        />
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <Step n="1" title="Upload or try a sample" body="Drop a front-facing photo, or start instantly with one of the bundled samples — nothing ever leaves your device." />
        <Step n="2" title="Read the breakdown" body="Symmetry, ratios, posture, expression, hair, and prioritized weakspots with practical, non-invasive fixes." />
        <Step n="3" title="Compare and improve" body="Run a dating-profile scorecard, or compare two photos side by side to see what actually moved." />
      </section>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="card p-6">
      <span className="grid h-8 w-8 place-items-center rounded-full border border-accent-500/30 bg-accent-500/10 text-sm font-semibold text-accent-300">
        {n}
      </span>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-white/55">{body}</p>
    </div>
  );
}

function Pillar({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="card p-6">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/5">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-white/55">{body}</p>
    </div>
  );
}
