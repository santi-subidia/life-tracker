import React from "react";
import Link from "next/link";

export interface SomaLogoProps {
  /**
   * Layout variant:
   * - "mark": Only the dual infinite loop icon
   * - "horizontal": Icon + "SOMA" wordmark side-by-side
   * - "stacked": Centered icon with wordmark below
   */
  variant?: "mark" | "horizontal" | "stacked";
  /**
   * Predefined size or custom scale
   */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  /**
   * Optional custom class for the container
   */
  className?: string;
  /**
   * Whether to display the luminous cyan-violet backglow
   */
  withGlow?: boolean;
  /**
   * Wrap with a Next.js Link to destination (e.g. "/")
   */
  href?: string;
}

const SIZE_MAP = {
  xs: { mark: 22, text: "text-xs", sub: "text-[8px]" },
  sm: { mark: 28, text: "text-sm", sub: "text-[9px]" },
  md: { mark: 36, text: "text-base", sub: "text-[10px]" },
  lg: { mark: 48, text: "text-lg", sub: "text-[11px]" },
  xl: { mark: 64, text: "text-xl", sub: "text-xs" },
  "2xl": { mark: 96, text: "text-3xl", sub: "text-sm" },
};

/**
 * Isotipo vectorial SVG: Dual Infinite Loop (Opción 1)
 * Diseñado con geometría de vórtices entrelazados, resplandor cian/azul etéreo
 * y reflejos en platino satinado.
 */
export function SomaMark({
  size = 36,
  withGlow = true,
  className = "",
}: {
  size?: number;
  withGlow?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size * 0.65 }}
    >
      {/* Halo luminiscente cian-violeta */}
      {withGlow && (
        <div
          className="absolute inset-0 bg-gradient-to-r from-sky-500/25 via-cyan-400/30 to-indigo-500/25 blur-md rounded-full pointer-events-none -z-10 transform scale-125 opacity-70 group-hover:opacity-100 transition-opacity"
          aria-hidden="true"
        />
      )}

      <svg
        viewBox="0 0 120 70"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_2px_8px_rgba(56,189,248,0.25)]"
      >
        <defs>
          {/* Gradiente Platino Satinado Anillo Izquierdo */}
          <linearGradient id="somaSilverLeft" x1="15" y1="10" x2="65" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#cbd5e1" />
            <stop offset="70%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>

          {/* Gradiente Platino Satinado Anillo Derecho */}
          <linearGradient id="somaSilverRight" x1="55" y1="10" x2="105" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="30%" stopColor="#e2e8f0" />
            <stop offset="70%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>

          {/* Resplandor del Núcleo Entrelazado */}
          <radialGradient id="somaCoreGlow" cx="60" cy="35" r="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#818cf8" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#09090b" stopOpacity="0" />
          </radialGradient>

          {/* Brillo de arco interior */}
          <linearGradient id="somaArcLight" x1="30" y1="15" x2="90" y2="55" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#67e8f9" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Resplandor central de fusión */}
        <circle cx="60" cy="35" r="24" fill="url(#somaCoreGlow)" />

        {/* ===== ANILLO IZQUIERDO (Vitalidad / Cuerpo / Hábitos) ===== */}
        {/* Órbita exterior */}
        <circle
          cx="42"
          cy="35"
          r="24"
          stroke="url(#somaSilverLeft)"
          strokeWidth="3.2"
          strokeLinecap="round"
          opacity="0.9"
        />
        {/* Arcos de vórtice izquierdo */}
        <path
          d="M 24 25 C 28 16, 46 14, 56 22 C 60 26, 62 33, 60 40 C 58 48, 48 55, 38 55 C 26 55, 18 45, 22 33"
          stroke="url(#somaArcLight)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M 32 30 C 35 22, 47 22, 53 28 C 58 34, 54 44, 46 47 C 37 49, 30 42, 32 33"
          stroke="#e2e8f0"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.8"
        />

        {/* ===== ANILLO DERECHO (Mente / Segundo Cerebro / Inteligencia) ===== */}
        {/* Órbita exterior */}
        <circle
          cx="78"
          cy="35"
          r="24"
          stroke="url(#somaSilverRight)"
          strokeWidth="3.2"
          strokeLinecap="round"
          opacity="0.95"
        />
        {/* Arcos de vórtice derecho */}
        <path
          d="M 96 45 C 92 54, 74 56, 64 48 C 60 44, 58 37, 60 30 C 62 22, 72 15, 82 15 C 94 15, 102 25, 98 37"
          stroke="url(#somaArcLight)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M 88 40 C 85 48, 73 48, 67 42 C 62 36, 66 26, 74 23 C 83 21, 90 28, 88 37"
          stroke="#f8fafc"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.8"
        />

        {/* Puntos focales de luz en la unión */}
        <circle cx="60" cy="27" r="1.8" fill="#e0f2fe" filter="drop-shadow(0 0 4px #38bdf8)" />
        <circle cx="60" cy="43" r="1.8" fill="#c7d2fe" filter="drop-shadow(0 0 4px #818cf8)" />
      </svg>
    </div>
  );
}

/**
 * Componente principal del Logotipo de Soma
 */
export function SomaLogo({
  variant = "horizontal",
  size = "md",
  className = "",
  withGlow = true,
  href,
}: SomaLogoProps) {
  const config = SIZE_MAP[size] || SIZE_MAP.md;

  const content = (
    <div
      className={`group inline-flex items-center transition-all ${
        variant === "stacked" ? "flex-col gap-2 text-center" : "gap-3"
      } ${className}`}
    >
      {/* Contenedor del Isotipo */}
      <div className="relative flex items-center justify-center px-2 py-1.5 rounded-xl bg-neutral-900/90 border border-neutral-700/70 group-hover:border-neutral-500/80 transition-colors shadow-inner">
        <SomaMark size={config.mark} withGlow={withGlow} />
      </div>

      {variant !== "mark" && (
        <div className={`flex flex-col ${variant === "stacked" ? "items-center" : ""}`}>
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black tracking-[0.24em] uppercase text-neutral-100 group-hover:text-white transition-colors ${config.text}`}
            >
              SOMA
            </span>
          </div>
          <span
            className={`uppercase tracking-[0.2em] text-neutral-400 font-mono font-medium -mt-0.5 ${config.sub}`}
          >
            Personal OS
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
}

export default SomaLogo;
