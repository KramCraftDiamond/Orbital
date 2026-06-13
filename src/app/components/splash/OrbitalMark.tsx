interface OrbitalMarkProps {
  className?: string;
}

/**
 * Approximate circumference of the orbital ellipse (rx=75, ry=25).
 * Used for strokeDasharray/strokeDashoffset drawing animation.
 * C ≈ π [ 3(a+b) − √((3a+b)(a+3b)) ]
 * a=75, b=25 => a+b=100
 * C ≈ π [ 300 - √((225+25)(75+75)) ] = π [ 300 - √(250 * 150) ] = π [ 300 - √37500 ] ≈ π [ 300 - 193.65 ] ≈ π * 106.35 ≈ 334.1
 */
const RING_CIRCUMFERENCE = 334;

export function OrbitalMark({ className }: OrbitalMarkProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      data-gsap-target="hero-orbital-logo"
      aria-label="Orbital logo"
      role="img"
    >
      {/* Orbit ring */}
      <ellipse
        cx="100"
        cy="100"
        rx="75"
        ry="25"
        stroke="#ffffff"
        strokeWidth="1.5"
        fill="none"
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={RING_CIRCUMFERENCE}
        data-gsap-target="splash-ring"
        style={{ opacity: 0 }}
      />

      {/* Central core */}
      <circle
        cx="100"
        cy="100"
        r="24"
        fill="#000000"
        data-gsap-target="splash-core"
        style={{ opacity: 0, transformOrigin: 'center center' }}
      />

      {/* Node 1 */}
      <circle
        cx="45"
        cy="88"
        r="11"
        fill="#ffffff"
        stroke="#000000"
        strokeWidth="1.5"
        data-gsap-target="splash-node"
        style={{ opacity: 0, transformOrigin: 'center center' }}
      />

      {/* Node 2 */}
      <circle
        cx="165"
        cy="108"
        r="7"
        fill="#ffffff"
        stroke="#000000"
        strokeWidth="1.5"
        data-gsap-target="splash-node"
        style={{ opacity: 0, transformOrigin: 'center center' }}
      />

      {/* Node 3 */}
      <circle
        cx="110"
        cy="124"
        r="4"
        fill="#ffffff"
        stroke="#000000"
        strokeWidth="1"
        data-gsap-target="splash-node"
        style={{ opacity: 0, transformOrigin: 'center center' }}
      />
    </svg>
  );
}
