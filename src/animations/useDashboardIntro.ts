import { useEffect, type RefObject } from "react";
import { gsap } from "./gsap";

export function useDashboardIntro(scope: RefObject<HTMLElement>) {
  useEffect(() => {
    if (!scope.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: {
          ease: "power3.out",
          duration: 0.65,
        },
      });

      tl.from('[data-gsap-target="page-header"]', {
        opacity: 0,
        y: 24,
      })
        .from(
          '[data-gsap-target="page-title"]',
          {
            opacity: 0,
            y: 18,
          },
          "-=0.45"
        )
        .from(
          '[data-gsap-target="date-chip"]',
          {
            opacity: 0,
            x: 18,
          },
          "-=0.45"
        )
        .from(
          '[data-gsap-target="metric-card"]',
          {
            opacity: 0,
            y: 32,
            stagger: 0.08,
          },
          "-=0.25"
        )
        .from(
          '[data-gsap-target="dashboard-panel"]',
          {
            opacity: 0,
            y: 36,
            stagger: 0.1,
          },
          "-=0.25"
        )
        .from(
          '[data-gsap-target="evidence-row"]',
          {
            opacity: 0,
            x: -14,
            stagger: 0.06,
          },
          "-=0.35"
        )
        .from(
          '[data-gsap-target="risk-card"]',
          {
            opacity: 0,
            scale: 0.96,
            stagger: 0.06,
          },
          "-=0.35"
        );
    }, scope);

    return () => ctx.revert();
  }, [scope]);
}