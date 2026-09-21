"use client";

import { MotionConfig, motion, type HTMLMotionProps } from "framer-motion";

// Shared spring for press feedback — quick attack, slight settle.
const PRESS_SPRING = { type: "spring", stiffness: 480, damping: 28 } as const;

/**
 * Global motion preferences: honors the OS "reduce motion" setting for every
 * framer-motion animation mounted below it (transform-based animations are
 * disabled; opacity fades remain).
 */
export function AppMotionConfig({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/**
 * Route-level entrance, mounted once from app/template.tsx. Next.js remounts
 * template on every navigation, so forward, back, and first load all replay
 * the same soft rise.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * A button with tactile press/hover feedback. Drop-in for <button> — same
 * props, plus a springy scale on tap. Layout is unchanged (no wrapper div).
 */
export function TactileButton(props: HTMLMotionProps<"button">) {
  return (
    <motion.button
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.97 }}
      transition={PRESS_SPRING}
      {...props}
    />
  );
}

/**
 * The animated completion circle used by every daily checklist row. Draws the
 * check in when `done` flips true; the fill/border color pops via CSS
 * transition-colors. Same footprint as the static circle it replaces.
 */
export function CheckCircle({
  done,
  className = "",
}: {
  done: boolean;
  className?: string;
}) {
  return (
    <span
      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors ${
        done
          ? "border-accent-500 bg-accent-500 text-white"
          : "border-white/25 text-transparent"
      } ${className}`}
    >
      <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
        <motion.path
          d="M2.6 6.4 L4.9 8.7 L9.4 3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        />
      </svg>
    </span>
  );
}
