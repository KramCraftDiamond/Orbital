import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef } from "react";

interface SatelliteMarker {
  id: string;
  location: [number, number];
  label: string;
}

const defaultMarkers: SatelliteMarker[] = [
  { id: "rbi", location: [19.076, 72.8777], label: "RBI" },
  { id: "npci", location: [28.6139, 77.209], label: "NPCI" },
  { id: "cert", location: [12.9716, 77.5946], label: "CERT-In" },
  { id: "sebi", location: [18.96, 72.82], label: "SEBI" },
  { id: "irdai", location: [17.385, 78.4867], label: "IRDAI" },
  { id: "fiu", location: [28.5355, 77.391], label: "FIU-IND" },
  { id: "node-1", location: [51.5072, -0.1276], label: "Policy" },
  { id: "node-2", location: [1.3521, 103.8198], label: "Evidence" },
];

export function WarmGlobeSatellites({
  markers = defaultMarkers,
  speed = 0.0018,
}: {
  markers?: SatelliteMarker[];
  speed?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null);
  const dragOffset = useRef({ phi: 0, theta: 0 });
  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0);
  const isPausedRef = useRef(false);

  const handlePointerDown = useCallback((event: ReactPointerEvent) => {
    pointerInteracting.current = { x: event.clientX, y: event.clientY };
    dragOffset.current = { phi: 0, theta: 0 };
    isPausedRef.current = true;
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
  }, []);

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi;
      thetaOffsetRef.current += dragOffset.current.theta;
      dragOffset.current = { phi: 0, theta: 0 };
    }
    pointerInteracting.current = null;
    isPausedRef.current = false;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
  }, []);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        dragOffset.current = {
          phi: (event.clientX - pointerInteracting.current.x) / 320,
          theta: (event.clientY - pointerInteracting.current.y) / 1100,
        };
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerUp]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;
    let globe: { destroy: () => void } | null = null;
    let phi = -0.8;

    async function init() {
      if (!canvas || globe || canvas.offsetWidth === 0) return;
      const { default: createGlobe } = await import("cobe");
      if (!canvas || globe || disposed) return;
      const width = canvas.offsetWidth;

      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width,
        height: width,
        phi,
        theta: 0.22,
        dark: 1,
        diffuse: 1.15,
        mapSamples: 14000,
        mapBrightness: 4.9,
        baseColor: [0.125, 0.085, 0.05],
        markerColor: [0.882, 0.863, 0.788],
        glowColor: [0.255, 0.176, 0.082],
        markerSize: 0.045,
        markers: markers.map((marker) => ({
          id: marker.id,
          location: marker.location,
          size: marker.id.includes("node") ? 0.035 : 0.055,
        })),
        onRender: (state) => {
          if (!isPausedRef.current && !reducedMotion) phi += speed;
          state.phi = phi + phiOffsetRef.current + dragOffset.current.phi;
          state.theta = 0.22 + thetaOffsetRef.current + dragOffset.current.theta;
        },
      });

      canvas.style.opacity = "1";
    }

    if (canvas.offsetWidth > 0) {
      init();
    } else {
      const resizeObserver = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0) {
          resizeObserver.disconnect();
          init();
        }
      });
      resizeObserver.observe(canvas);
    }

    return () => {
      disposed = true;
      globe?.destroy();
    };
  }, [markers, speed]);

  return (
    <div className="relative aspect-square w-full select-none">
      <div className="absolute inset-8 rounded-full bg-[#E1DCC9]/[0.03] blur-2xl" />
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        className="relative h-full w-full opacity-0 transition-opacity duration-1000"
        style={{
          cursor: "grab",
          borderRadius: "9999px",
          touchAction: "none",
          filter: "drop-shadow(0 36px 90px rgba(0,0,0,0.72))",
        }}
      />
      <div className="pointer-events-none absolute inset-0 rounded-full border border-[#E1DCC9]/10" />
      <div className="pointer-events-none absolute left-4 top-6 rounded-full border border-[#E1DCC9]/15 bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase text-[#E1DCC9]/70 backdrop-blur">
        Regulatory orbit
      </div>
    </div>
  );
}
