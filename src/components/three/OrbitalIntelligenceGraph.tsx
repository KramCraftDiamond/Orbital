import { useEffect, useRef } from "react";
import { regulators, regulatorColors } from "../../data/mockData";

export function OrbitalIntelligenceGraph({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frameId = 0;
    let disposed = false;

    async function setup() {
      const THREE = await import("three");
      if (disposed || !container) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
      camera.position.set(0, 0, compact ? 7 : 8);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
      container.appendChild(renderer.domElement);

      const root = new THREE.Group();
      scene.add(root);

      const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xe1dcc9, transparent: true, opacity: 0.92 });
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.26, 32, 32), coreMaterial);
      root.add(core);

      const ringMaterial = new THREE.LineBasicMaterial({ color: 0xe1dcc9, transparent: true, opacity: 0.22 });
      for (let i = 0; i < 3; i += 1) {
        const points: Array<InstanceType<typeof THREE.Vector3>> = [];
        const radius = 1.35 + i * 0.58;
        for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.08) {
          points.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius * 0.34, 0));
        }
        const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), ringMaterial.clone());
        ring.rotation.z = i * 0.7;
        ring.rotation.x = 0.58 + i * 0.18;
        root.add(ring);
      }

      const nodeGroup = new THREE.Group();
      root.add(nodeGroup);

      regulators.forEach((regulator, index) => {
        const angle = (index / regulators.length) * Math.PI * 2;
        const radius = compact ? 1.55 : 2.25;
        const color = regulatorColors[regulator].replace("#", "0x");
        const node = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 16, 16),
          new THREE.MeshBasicMaterial({ color: Number(color), transparent: true, opacity: 0.9 }),
        );
        node.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.52, Math.sin(angle) * 0.42);
        nodeGroup.add(node);

        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), node.position.clone()]),
          new THREE.LineBasicMaterial({ color: Number(color), transparent: true, opacity: 0.28 }),
        );
        nodeGroup.add(line);
      });

      const particleGeometry = new THREE.BufferGeometry();
      const particleCount = compact ? 70 : 140;
      const positions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i += 1) {
        const radius = 1 + Math.random() * 2.9;
        const angle = Math.random() * Math.PI * 2;
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 2.8;
        positions[i * 3 + 2] = Math.sin(angle) * radius * 0.5;
      }
      particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const particles = new THREE.Points(
        particleGeometry,
        new THREE.PointsMaterial({ color: 0x8a7f6c, size: 0.018, transparent: true, opacity: 0.42 }),
      );
      root.add(particles);

      function resize() {
        const width = container.clientWidth || 640;
        const height = container.clientHeight || 360;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }

      resize();
      window.addEventListener("resize", resize);

      function animate() {
        if (disposed) return;
        if (!reducedMotion) {
          root.rotation.y += 0.0022;
          nodeGroup.rotation.z += 0.0016;
          particles.rotation.y -= 0.0008;
        }
        renderer.render(scene, camera);
        frameId = requestAnimationFrame(animate);
      }

      animate();

      return () => {
        window.removeEventListener("resize", resize);
        cancelAnimationFrame(frameId);
        renderer.dispose();
        particleGeometry.dispose();
        scene.traverse((object) => {
          const mesh = object as unknown as { geometry?: { dispose: () => void }; material?: { dispose: () => void } };
          mesh.geometry?.dispose();
          mesh.material?.dispose();
        });
        renderer.domElement.remove();
      };
    }

    let cleanup: undefined | (() => void);
    setup().then((dispose) => {
      cleanup = dispose;
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [compact]);

  return (
    <div
      ref={containerRef}
      className={`relative min-h-72 overflow-hidden rounded-lg border border-border-default bg-[radial-gradient(circle_at_50%_50%,rgba(225,220,201,0.14),rgba(0,0,0,0)_55%)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0))]" />
      <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-accent-cyan">Orbital Intelligence Graph</p>
          <p className="mt-1 max-w-xs text-xs text-text-muted">
            Regulators flow into the ORBITAL core and route validated obligations to execution teams.
          </p>
        </div>
        <span className="rounded-full border border-accent-success/30 bg-accent-success/10 px-3 py-1 text-[10px] font-semibold uppercase text-accent-success">
          On-prem ready
        </span>
      </div>
    </div>
  );
}
