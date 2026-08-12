import Link from "next/link";
import { ArrowRight, ScanFace } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/5">
        <ScanFace className="h-8 w-8 text-white/40" />
      </span>
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight">Page not found</h1>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-white/55">
          That page doesn&apos;t exist — but your photos are still safe. They
          never left your device.
        </p>
      </div>
      <Link href="/" className="btn-primary">
        Back home <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
