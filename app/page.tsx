import Link from "next/link";
import {
  ArrowRight,
  Camera,
  ScanFace,
  ShieldCheck,
  Wand2,
  CheckCircle2,
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col gap-16">
      <section className="relative -mx-6 -mt-10 overflow-hidden bg-grid-fade px-6 pb-20 pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-wider text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
            AI photo analysis · private · in-browser
          </div>
          <h1 className="text-balance text-5xl font-semibold tracking-tight md:text-6xl">
            One photo.{" "}
            <span className="bg-gradient-to-br from-accent-300 to-accent-600 bg-clip-text text-transparent">
              Your daily routine.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-lg leading-relaxed text-white/60">
            Upload a selfie and Chizle&apos;s AI maps your face, scores what it
            sees, and hands you a personalized daily routine in seconds — the
            exact tweaks that will move your read. Nothing to learn, nothing to
            configure.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/auth?returnTo=/analyze" className="btn-primary">
              <Camera className="h-4 w-4" />
              Get your first scan <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/auth?returnTo=/dashboard" className="btn-secondary">
              <ScanFace className="h-4 w-4" />
              See my routine
            </Link>
          </div>
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-white/40">
            <ShieldCheck className="h-3.5 w-3.5" />
            Runs on-device with MediaPipe. Your photos stay private.
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-sm font-medium uppercase tracking-wider text-white/40">
          From photo to routine in one minute
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Step
            n="1"
            icon={Camera}
            title="Upload a selfie"
            body="Any front-facing photo works. The AI maps 468 facial landmarks right in your browser — the image never leaves your device."
          />
          <Step
            n="2"
            icon={ScanFace}
            title="Get your instant read"
            body="Chizle scores symmetry, definition, and expression, then identifies the small number of changes that actually matter for you."
          />
          <Step
            n="3"
            icon={CheckCircle2}
            title="Follow your daily routine"
            body="One personalized checklist: the facial exercises, grooming steps, and habits that move your score. Check them off in under a minute a day."
          />
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <Pillar
          icon={Wand2}
          title="Actionable, not aesthetic"
          body="Every insight is paired with a practical habit, posture cue, or style fix. No surgical advice, no harsh judgment."
        />
        <Pillar
          icon={ScanFace}
          title="468 landmarks, one report"
          body="MediaPipe FaceMesh maps your face into 468 points. We turn that into symmetry, ratio, and posture scores you can trust."
        />
        <Pillar
          icon={ShieldCheck}
          title="Private by design"
          body="Everything runs in your browser. The image never leaves the device, while your personalized profile stays protected."
        />
      </section>

      <section className="card mx-auto max-w-2xl p-8 text-center sm:p-10">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Your first scan takes 15 seconds.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/55">
          Answer two quick questions, upload a photo, and your personalized
          daily routine is waiting. That&apos;s the whole setup.
        </p>
        <Link href="/auth?returnTo=/analyze" className="btn-primary mt-6">
          <Camera className="h-4 w-4" />
          Start now <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}

function Step({
  n,
  icon: Icon,
  title,
  body,
}: {
  n: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-white/80">
          <Icon className="h-5 w-5" />
        </span>
        <span className="font-mono text-sm text-accent-400/70">{n}</span>
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
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
