import { RefObject } from "react";
import { gsap, useGSAP } from "./gsap";

interface UseSplashSequenceProps {
  containerRef: RefObject<HTMLDivElement | null>;
  onComplete: () => void;
  reducedMotion: boolean;
}

/**
 * Orbital Splash Sequence — 5 phases, max 2.6s.
 *
 * Story: Acquire → Orbit → Converge → Core Expands → App Revealed
 *
 * The shutter mask is a dark circle (#000000) centered on the SVG core.
 * It expands from the core outward — conveying the intelligence engine
 * opening into the operational dashboard. It is NOT the white nodes.
 *
 * The app shell is NEVER hidden via opacity:0 in this hook.
 * The fixed splash overlay (z-index 50) covers the app naturally.
 * After the splash overlay fades out, onComplete unmounts it cleanly.
 */
export function useSplashSequence({
  containerRef,
  onComplete,
  reducedMotion,
}: UseSplashSequenceProps) {
  useGSAP(
    () => {
      const container = containerRef.current;
      if (!container) return;

      // Guard: prevent double-call in React StrictMode
      let completed = false;
      const safeComplete = () => {
        if (!completed) {
          completed = true;
          onComplete();
        }
      };

      // ── Targets (all scoped inside the splash container) ──────────
      const core    = container.querySelector('[data-gsap-target="splash-core"]');
      const ring    = container.querySelector('[data-gsap-target="splash-ring"]');
      const nodes   = container.querySelectorAll('[data-gsap-target="splash-node"]');
      const title   = container.querySelector('[data-gsap-target="splash-title"]');
      const status  = container.querySelector('[data-gsap-target="splash-status"]');
      const shutter = container.querySelector('[data-gsap-target="shutter-mask"]');
      // splash-root is the container itself (has position:fixed, z-index:50)
      const splashOverlay = container;

      // ── Reduced motion: skip everything, just fade out overlay ────
      if (reducedMotion) {
        gsap.to(splashOverlay, {
          opacity: 0,
          duration: 0.25,
          ease: "power2.out",
          onComplete: safeComplete,
        });
        return;
      }

      // ── Orbital math: cx=100, cy=100, rx=75, ry=25 ───────────────
      // Pre-compute initial parametric angle for each node from its
      // authored SVG position so the orbit starts exactly where the
      // node is drawn — no jump on orbit start.
      const toAngle = (x: number, y: number) =>
        Math.atan2((y - 100) / 25, (x - 100) / 75);

      const baseAngles = [
        toAngle(45, 88),   // Node 1 (r=11)
        toAngle(165, 108), // Node 2 (r=7)
        toAngle(110, 124), // Node 3 (r=4)
      ];

      // ── Main timeline ─────────────────────────────────────────────
      const tl = gsap.timeline({ onComplete: safeComplete });

      // Phase 1 — Boot (0 → 0.25s)
      // Core and ring materialise on the dark background.
      tl.set([core, nodes, title, status, shutter], { opacity: 0 });
      tl.set(shutter, { scale: 0 });
      tl.set(core, { scale: 0.4 });

      tl.to(core, {
        scale: 1,
        opacity: 1,
        duration: 0.25,
        ease: "power3.out",
      });
      tl.to(
        ring,
        {
          opacity: 0.85,
          strokeDashoffset: 0,
          duration: 0.25,
          ease: "power2.out",
        },
        "<"
      );

      // Phase 2 — Signal Acquisition: nodes fade in (0.2 → 0.5s)
      nodes.forEach((node, i) => {
        tl.to(
          node,
          { opacity: 1, scale: 1, duration: 0.15, ease: "power3.out" },
          0.2 + i * 0.07
        );
      });

      // Title + status line
      tl.to(title,  { opacity: 1, duration: 0.25, ease: "power3.out" }, 0.35);
      tl.to(status, { opacity: 0.7, duration: 0.2, ease: "power3.out" }, 0.4);

      // Phase 3 — Orbit (0.5 → 1.3s)
      // Parametric orbit: one full revolution over 0.8s, linear ease.
      const orbit = { t: 0 };
      tl.to(
        orbit,
        {
          t: 1,
          duration: 0.8,
          ease: "none",
          onUpdate() {
            const delta = orbit.t * Math.PI * 2;
            nodes.forEach((node, i) => {
              const angle = baseAngles[i] + delta;
              const x = 100 + 75 * Math.cos(angle);
              const y = 100 + 25 * Math.sin(angle);
              (node as SVGCircleElement).setAttribute("cx", String(x));
              (node as SVGCircleElement).setAttribute("cy", String(y));
            });
          },
        },
        0.5
      );

      // Phase 4 — Converge (1.3 → 1.65s)
      // Nodes move inward to core center (100,100) and shrink/fade.
      // We use a callback at t=1.3 to read current positions, then tween.
      tl.add(() => {
        nodes.forEach((node) => {
          const el = node as SVGCircleElement;
          gsap.to(el, {
            attr: { cx: 100, cy: 100 },
            opacity: 0,
            scale: 0,
            duration: 0.3,
            ease: "power4.inOut",
          });
        });
      }, 1.3);

      // Core absorbs them — brief pulse then settle
      tl.to(core, { scale: 1.2, duration: 0.15, ease: "power4.inOut" }, 1.45);
      tl.to(core, { scale: 1.0, duration: 0.15, ease: "power4.inOut" }, 1.6);

      // Fade out ring, title, status as core is about to expand
      tl.to([ring, title, status], {
        opacity: 0,
        duration: 0.2,
        ease: "power3.out",
      }, 1.4);

      // Phase 5 — Core Expansion (1.7 → 2.15s)
      // Dark shutter mask (same color as splash bg #000000) expands
      // from the exact center of the SVG core, covering the screen.
      // This is the intelligence engine "opening" — not the white nodes.
      tl.to(
        shutter,
        {
          scale: 60,
          duration: 0.45,
          ease: "expo.inOut",
        },
        1.7
      );

      // Fade the entire fixed splash overlay out as shutter is mid-expand.
      // The app is already rendered underneath at full opacity.
      // onComplete fires when the timeline ends → setShowSplash(false) unmounts this.
      tl.to(
        splashOverlay,
        {
          opacity: 0,
          duration: 0.3,
          ease: "power2.inOut",
        },
        1.95
      );
    },
    { scope: containerRef }
  );
}
