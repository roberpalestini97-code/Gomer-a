"use client";

import { useId } from "react";
import {
  LOGO_VIEWBOX,
  MARK_BOTTOM_BAND,
  MARK_BRIGHT_RIM,
  MARK_FLAME,
  MARK_FLAME_HIGHLIGHT,
  MARK_G,
  MARK_LEFT_BAND,
  MARK_STAR,
  MARK_TOP_BAND,
  MARK_TRANSFORM,
  MARK_VIEWBOX,
  PILL,
  PILL_TEXT,
  WORD_APP,
  WORD_GOMER,
  WORD_GOMER_ADVANCE,
  WORD_IA,
  WORD_TRANSFORM,
} from "./logo-paths";

type LogoProps = {
  /** Solo el isotipo (G + destello), sin logotipo. */
  compact?: boolean;
  /** Muestra la pastilla «.app». */
  badge?: boolean;
  className?: string;
  /**
   * Fuerza una versión del isotipo. Por defecto alterna con el tema:
   * color sobre fondo oscuro y monocromo sobre fondo claro.
   */
  variant?: "auto" | "color" | "mono";
};

/**
 * Isotipo a color. Los degradados y el bisel están definidos dentro del propio
 * SVG para que funcione igual en web, app y exportaciones.
 */
function MarkColor({ uid, themed }: { uid: string; themed: boolean }) {
  return (
    <g className={themed ? "logo-mark-color" : undefined}>
      <defs>
        <linearGradient
          id={`${uid}-front`}
          x1="0"
          y1="24"
          x2="0"
          y2="136"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#FFDE00" />
          <stop offset=".5" stopColor="#FFDA00" />
          <stop offset="1" stopColor="#FFD600" />
        </linearGradient>

        <radialGradient
          id={`${uid}-left`}
          cx="86"
          cy="76"
          r="48"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(0,30.4) scale(1,0.6)"
        >
          <stop offset="0" stopColor="#A04800" stopOpacity=".82" />
          <stop offset=".5" stopColor="#A04800" stopOpacity=".68" />
          <stop offset=".58" stopColor="#A85000" stopOpacity=".6" />
          <stop offset=".63" stopColor="#A85000" stopOpacity=".5" />
          <stop offset=".68" stopColor="#B04800" stopOpacity=".38" />
          <stop offset=".76" stopColor="#B04800" stopOpacity=".3" />
          <stop offset=".88" stopColor="#C06000" stopOpacity=".12" />
          <stop offset="1" stopColor="#FFD400" stopOpacity="0" />
        </radialGradient>

        <linearGradient
          id={`${uid}-band-fade`}
          x1="0"
          y1="50"
          x2="0"
          y2="104"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#000" />
          <stop offset=".18" stopColor="#fff" stopOpacity=".7" />
          <stop offset=".4" stopColor="#fff" />
          <stop offset=".62" stopColor="#fff" />
          <stop offset=".78" stopColor="#fff" stopOpacity=".5" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <mask id={`${uid}-band-mask`}>
          <rect x="30" y="50" width="60" height="60" fill={`url(#${uid}-band-fade)`} />
        </mask>

        <linearGradient
          id={`${uid}-top`}
          x1="74"
          y1="0"
          x2="114"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#8C3C00" stopOpacity=".55" />
          <stop offset=".4" stopColor="#A04800" stopOpacity=".35" />
          <stop offset=".75" stopColor="#B05000" stopOpacity=".15" />
          <stop offset="1" stopColor="#C06000" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`${uid}-top-fade`}
          x1="0"
          y1="54"
          x2="0"
          y2="68"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#fff" />
          <stop offset=".35" stopColor="#fff" stopOpacity=".7" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={`${uid}-top-mask`}>
          <rect x="68" y="52" width="52" height="18" fill={`url(#${uid}-top-fade)`} />
        </mask>

        <linearGradient
          id={`${uid}-bottom`}
          x1="78"
          y1="0"
          x2="111"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#A65E00" stopOpacity="0" />
          <stop offset=".2" stopColor="#A65E00" stopOpacity=".04" />
          <stop offset=".4" stopColor="#A65E00" stopOpacity=".12" />
          <stop offset=".6" stopColor="#A03C00" stopOpacity=".34" />
          <stop offset=".7" stopColor="#983800" stopOpacity=".55" />
          <stop offset=".8" stopColor="#8C3A00" stopOpacity=".7" />
          <stop offset="1" stopColor="#8C2C00" stopOpacity=".8" />
        </linearGradient>
        <linearGradient
          id={`${uid}-bottom-fade`}
          x1="0"
          y1="118"
          x2="0"
          y2="136"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#fff" />
          <stop offset=".45" stopColor="#fff" stopOpacity=".9" />
          <stop offset=".75" stopColor="#fff" stopOpacity=".6" />
          <stop offset="1" stopColor="#fff" stopOpacity=".25" />
        </linearGradient>
        <mask id={`${uid}-bottom-mask`}>
          <rect x="60" y="96" width="60" height="42" fill={`url(#${uid}-bottom-fade)`} />
        </mask>
        <linearGradient
          id={`${uid}-seam`}
          x1="0"
          y1="102"
          x2="0"
          y2="113"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#2A1200" stopOpacity=".38" />
          <stop offset=".45" stopColor="#2A1200" stopOpacity=".12" />
          <stop offset="1" stopColor="#2A1200" stopOpacity="0" />
        </linearGradient>

        <linearGradient
          id={`${uid}-flame`}
          x1="90"
          y1="79"
          x2="139"
          y2="132"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#F7C900" />
          <stop offset=".5" stopColor="#F8CE00" />
          <stop offset="1" stopColor="#FFE200" />
        </linearGradient>
        <linearGradient
          id={`${uid}-star`}
          x1="126"
          y1="55"
          x2="136"
          y2="96"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#FFE400" />
          <stop offset=".45" stopColor="#FFD800" />
          <stop offset="1" stopColor="#FFC800" />
        </linearGradient>

        <filter
          id={`${uid}-flame-shadow`}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feDropShadow
            dx="1"
            dy="1.4"
            stdDeviation="1"
            floodColor="#241200"
            floodOpacity=".38"
          />
        </filter>

        <clipPath id={`${uid}-g-clip`}>
          <path d={MARK_G} />
        </clipPath>
      </defs>

      <path d={MARK_G} fill={`url(#${uid}-front)`} />

      <g clipPath={`url(#${uid}-g-clip)`}>
        <path
          d={MARK_LEFT_BAND}
          fill={`url(#${uid}-left)`}
          mask={`url(#${uid}-band-mask)`}
        />
        <path
          d={MARK_TOP_BAND}
          fill={`url(#${uid}-top)`}
          mask={`url(#${uid}-top-mask)`}
        />
        <g mask={`url(#${uid}-bottom-mask)`}>
          <path d={MARK_BOTTOM_BAND} fill={`url(#${uid}-bottom)`} />
          <path d={MARK_BOTTOM_BAND} fill={`url(#${uid}-seam)`} />
        </g>
        <path
          d={MARK_BRIGHT_RIM}
          fill="none"
          stroke="#FFE45A"
          strokeWidth="1.3"
          strokeOpacity=".55"
        />
      </g>

      <g clipPath={`url(#${uid}-g-clip)`}>
        <g filter={`url(#${uid}-flame-shadow)`}>
          <path d={MARK_FLAME} fill={`url(#${uid}-flame)`} />
        </g>
        <path
          d="M 110.3 104 L 110.3 126"
          fill="none"
          stroke="#7A3A00"
          strokeWidth="2.2"
          strokeOpacity=".3"
        />
        <path
          d={MARK_FLAME_HIGHLIGHT}
          fill="none"
          stroke="#FFE96A"
          strokeOpacity=".3"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </g>

      <path d={MARK_STAR} fill={`url(#${uid}-star)`} />
    </g>
  );
}

/**
 * Versión de un solo color con un bisel sutil. El bisel es blanco sobre el
 * frontal negro para que el pliegue se lea también en monocromo.
 */
function MarkMono({ uid, themed }: { uid: string; themed: boolean }) {
  return (
    <g className={themed ? "logo-mark-mono" : undefined}>
      <defs>
        <radialGradient
          id={`${uid}-mono-left`}
          cx="86"
          cy="76"
          r="48"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(0,30.4) scale(1,0.6)"
        >
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".3" />
          <stop offset=".5" stopColor="#FFFFFF" stopOpacity=".26" />
          <stop offset=".58" stopColor="#FFFFFF" stopOpacity=".22" />
          <stop offset=".63" stopColor="#FFFFFF" stopOpacity=".18" />
          <stop offset=".68" stopColor="#FFFFFF" stopOpacity=".14" />
          <stop offset=".76" stopColor="#FFFFFF" stopOpacity=".1" />
          <stop offset=".88" stopColor="#FFFFFF" stopOpacity=".04" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>

        <linearGradient
          id={`${uid}-mono-top`}
          x1="74"
          y1="0"
          x2="114"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".35" />
          <stop offset=".4" stopColor="#FFFFFF" stopOpacity=".22" />
          <stop offset=".75" stopColor="#FFFFFF" stopOpacity=".1" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        <linearGradient
          id={`${uid}-mono-bottom`}
          x1="78"
          y1="0"
          x2="111"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset=".2" stopColor="#FFFFFF" stopOpacity=".03" />
          <stop offset=".4" stopColor="#FFFFFF" stopOpacity=".08" />
          <stop offset=".6" stopColor="#FFFFFF" stopOpacity=".2" />
          <stop offset=".7" stopColor="#FFFFFF" stopOpacity=".3" />
          <stop offset=".8" stopColor="#FFFFFF" stopOpacity=".4" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity=".5" />
        </linearGradient>
        <linearGradient
          id={`${uid}-mono-seam`}
          x1="0"
          y1="102"
          x2="0"
          y2="113"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".16" />
          <stop offset=".45" stopColor="#FFFFFF" stopOpacity=".05" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        <linearGradient
          id={`${uid}-mono-band-fade`}
          x1="0"
          y1="50"
          x2="0"
          y2="104"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#000" />
          <stop offset=".18" stopColor="#fff" stopOpacity=".7" />
          <stop offset=".4" stopColor="#fff" />
          <stop offset=".62" stopColor="#fff" />
          <stop offset=".78" stopColor="#fff" stopOpacity=".5" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <mask id={`${uid}-mono-band-mask`}>
          <rect
            x="30"
            y="50"
            width="60"
            height="60"
            fill={`url(#${uid}-mono-band-fade)`}
          />
        </mask>

        <linearGradient
          id={`${uid}-mono-bottom-fade`}
          x1="0"
          y1="118"
          x2="0"
          y2="136"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#fff" />
          <stop offset=".45" stopColor="#fff" stopOpacity=".9" />
          <stop offset=".75" stopColor="#fff" stopOpacity=".6" />
          <stop offset="1" stopColor="#fff" stopOpacity=".25" />
        </linearGradient>
        <mask id={`${uid}-mono-bottom-mask`}>
          <rect
            x="60"
            y="96"
            width="60"
            height="42"
            fill={`url(#${uid}-mono-bottom-fade)`}
          />
        </mask>

        <linearGradient
          id={`${uid}-mono-top-fade`}
          x1="0"
          y1="54"
          x2="0"
          y2="68"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#fff" />
          <stop offset=".35" stopColor="#fff" stopOpacity=".7" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={`${uid}-mono-top-mask`}>
          <rect x="68" y="52" width="52" height="18" fill={`url(#${uid}-mono-top-fade)`} />
        </mask>

        <clipPath id={`${uid}-mono-g-clip`}>
          <path d={MARK_G} />
        </clipPath>
      </defs>

      <path d={MARK_G} fill="currentColor" />

      <g clipPath={`url(#${uid}-mono-g-clip)`}>
        <path
          d={MARK_LEFT_BAND}
          fill={`url(#${uid}-mono-left)`}
          mask={`url(#${uid}-mono-band-mask)`}
        />
        <path
          d={MARK_TOP_BAND}
          fill={`url(#${uid}-mono-top)`}
          mask={`url(#${uid}-mono-top-mask)`}
        />
        <g mask={`url(#${uid}-mono-bottom-mask)`}>
          <path d={MARK_BOTTOM_BAND} fill={`url(#${uid}-mono-bottom)`} />
          <path d={MARK_BOTTOM_BAND} fill={`url(#${uid}-mono-seam)`} />
        </g>
        <path
          d={MARK_BRIGHT_RIM}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.1"
          strokeOpacity=".28"
        />
      </g>

      <g clipPath={`url(#${uid}-mono-g-clip)`}>
        <path
          d="M 110.3 104 L 110.3 126"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeOpacity=".22"
        />
        <path
          d={MARK_FLAME_HIGHLIGHT}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1"
          strokeOpacity=".22"
          strokeLinecap="round"
        />
      </g>

      <path d={MARK_STAR} fill="currentColor" />
    </g>
  );
}

/**
 * Logotipo de GomerIA.app, dibujado como SVG (trazados, sin depender de fuentes).
 * El isotipo cambia de versión con el tema; el logotipo usa las variables --logo-*.
 */
export function Logo({
  compact = false,
  badge = true,
  className,
  variant = "auto",
}: LogoProps) {
  const rawId = useId();
  const uid = `logo-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const themed = variant === "auto";
  const showColor = variant !== "mono";
  const showMono = variant !== "color";
  const mark = (
    <>
      {showColor && <MarkColor uid={uid} themed={themed} />}
      {showMono && <MarkMono uid={uid} themed={themed} />}
    </>
  );

  if (compact) {
    return (
      <svg
        viewBox={MARK_VIEWBOX}
        className={className ?? "h-8 w-auto"}
        style={{ color: "var(--logo-mark)" }}
        role="img"
        aria-label="GomerIA.app"
        focusable="false"
      >
        {mark}
      </svg>
    );
  }

  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      className={className ?? "h-9 w-auto"}
      role="img"
      aria-label="GomerIA.app"
      focusable="false"
    >
      <g transform={MARK_TRANSFORM} style={{ color: "var(--logo-mark)" }}>
        {mark}
      </g>
      <g transform={WORD_TRANSFORM}>
        <path d={WORD_GOMER} fill="var(--logo-word)" />
        <g transform={`translate(${WORD_GOMER_ADVANCE} 0)`}>
          <path d={WORD_IA} fill="var(--logo-accent)" />
        </g>
      </g>
      {badge && (
        <g transform={`translate(${PILL.x} ${PILL.y})`}>
          <rect width={PILL.w} height={PILL.h} rx={PILL.r} fill="var(--logo-pill)" />
          <g transform={`translate(${PILL_TEXT.x} ${PILL_TEXT.y}) scale(${PILL_TEXT.scale})`}>
            <path d={WORD_APP} fill="var(--logo-pill-text)" />
          </g>
        </g>
      )}
    </svg>
  );
}
