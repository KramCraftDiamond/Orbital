// src/animations/useRouteReveal.ts
import { RefObject } from "react";
import { gsap, useGSAP } from "./gsap";

export function useRouteReveal(scope: RefObject<HTMLElement>, routeKey: string) {
  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;

      gsap.fromTo(
        root,
        { opacity: 0, y: 18, filter: "blur(8px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.55,
          ease: "power3.out",
        }
      );
    },
    {
      scope,
      dependencies: [routeKey],
      revertOnUpdate: true,
    }
  );
}