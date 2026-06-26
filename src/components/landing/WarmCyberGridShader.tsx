import { useEffect, useRef } from "react";

export function WarmCyberGridShader() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let cleanup: undefined | (() => void);

    async function setup() {
      const THREE = await import("three");
      if (disposed || !container) return;

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const clock = new THREE.Clock();

      const vertexShader = `
        void main() {
          gl_Position = vec4(position, 1.0);
        }
      `;

      const fragmentShader = `
        precision highp float;
        uniform vec2 iResolution;
        uniform float iTime;
        uniform vec2 iMouse;

        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        void main() {
          vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
          vec2 mouse = (iMouse - 0.5 * iResolution.xy) / iResolution.y;
          float t = iTime * 0.18;
          float mouseDist = length(uv - mouse);

          float warp = sin(mouseDist * 18.0 - t * 3.0) * 0.055;
          warp *= smoothstep(0.48, 0.0, mouseDist);
          uv += warp;

          vec2 gridUv = abs(fract(uv * 9.0) - 0.5);
          float line = pow(1.0 - min(gridUv.x, gridUv.y), 42.0);
          float majorGrid = pow(1.0 - min(abs(fract(uv.x * 3.0) - 0.5), abs(fract(uv.y * 3.0) - 0.5)), 58.0);

          vec3 black = vec3(0.0, 0.0, 0.0);
          vec3 espresso = vec3(0.121, 0.082, 0.047);
          vec3 bronze = vec3(0.255, 0.176, 0.082);
          vec3 parchment = vec3(0.882, 0.863, 0.788);

          float radial = smoothstep(1.15, 0.0, length(uv * vec2(0.85, 1.15)));
          vec3 color = mix(black, espresso, radial * 0.82);

          float pulse = 0.55 + 0.25 * sin(t * 2.0);
          color += bronze * line * (0.18 + pulse * 0.22);
          color += parchment * majorGrid * 0.045;

          float energy = sin(uv.x * 19.0 + t * 4.0) * sin(uv.y * 17.0 + t * 2.6);
          energy = smoothstep(0.86, 1.0, energy);
          color += parchment * energy * line * 0.22;

          float glow = smoothstep(0.18, 0.0, mouseDist);
          color += parchment * glow * 0.14;
          color += random(uv + t * 0.1) * 0.025;

          gl_FragColor = vec4(color, 0.88);
        }
      `;

      const uniforms = {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2() },
        iMouse: { value: new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2) },
      };

      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
        transparent: true,
      });

      const geometry = new THREE.PlaneGeometry(2, 2);
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      const onResize = () => {
        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight;
        renderer.setSize(width, height, false);
        uniforms.iResolution.value.set(width, height);
      };

      const onMouseMove = (event: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        uniforms.iMouse.value.set(event.clientX - rect.left, rect.height - (event.clientY - rect.top));
      };

      window.addEventListener("resize", onResize);
      window.addEventListener("mousemove", onMouseMove, { passive: true });
      onResize();

      renderer.setAnimationLoop(() => {
        uniforms.iTime.value = reducedMotion ? 0.8 : clock.getElapsedTime();
        renderer.render(scene, camera);
      });

      cleanup = () => {
        window.removeEventListener("resize", onResize);
        window.removeEventListener("mousemove", onMouseMove);
        renderer.setAnimationLoop(null);
        material.dispose();
        geometry.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    }

    setup();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 bg-black"
    />
  );
}
