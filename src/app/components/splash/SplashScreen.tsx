import { useRef } from "react";
import { OrbitalMark } from "./OrbitalMark";
import { useSplashSequence } from "../../../animations/useSplashSequence";
import { useReducedMotion } from "../../../animations/useReducedMotion";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useSplashSequence({
    containerRef,
    onComplete,
    reducedMotion,
  });

  return (
    <div ref={containerRef} className="splash-overlay" data-gsap-target="splash-root">
      {/* Centered logo, title, and status */}
      <div className="splash-logo-group">
        <OrbitalMark className="splash-mark" />
        
        <span className="splash-title" data-gsap-target="splash-title">
          Orbital
        </span>
        
        <span className="splash-status" data-gsap-target="splash-status">
          Initializing Regulatory Intelligence
        </span>
      </div>

      {/* Centered shutter mask circle for full screen expansion */}
      <div className="shutter-mask" data-gsap-target="shutter-mask" />
    </div>
  );
}
export default SplashScreen;
