/**
 * Pixel art sidebar scene — waterfall, trees, path, flowers, gardener.
 * Pure CSS + SVG, no canvas, no external images.
 * Renders as absolute-positioned background behind sidebar nav.
 */
export function PixelSidebarScene({ compact }: { compact?: boolean }) {
  const px = compact ? 3 : 4

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none opacity-60" aria-hidden="true">
      {/* Sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#87CEEB]/20 via-transparent to-transparent dark:from-[#0D4A3B]/30" />

      {/* ── Waterfall (top) ──────────────────────────── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
        {/* Cliff rocks */}
        <div className="flex gap-0" style={{ imageRendering: 'pixelated' }}>
          <div className="bg-[#8B7355]" style={{ width: px * 3, height: px * 2 }} />
          <div className="bg-[#6B5B45]" style={{ width: px * 2, height: px * 2 }} />
          <div className="animate-waterfall rounded-none" style={{ width: px * 6, height: px * 14 }} />
          <div className="bg-[#6B5B45]" style={{ width: px * 2, height: px * 2 }} />
          <div className="bg-[#8B7355]" style={{ width: px * 3, height: px * 2 }} />
        </div>

        {/* Water splash at bottom */}
        <div className="flex items-end gap-0 -mt-px">
          <div className="animate-sparkle bg-white/60 rounded-full" style={{ width: px, height: px, animationDelay: '0s' }} />
          <div className="bg-[#38BDF8]/50" style={{ width: px * 8, height: px * 2, animation: 'water-splash 1.2s ease-in-out infinite' }} />
          <div className="animate-sparkle bg-white/60 rounded-full" style={{ width: px, height: px, animationDelay: '0.6s' }} />
        </div>

        {/* Pool */}
        <div className="bg-[#0EA5E9]/20 dark:bg-[#0EA5E9]/10 rounded-full" style={{ width: px * 14, height: px * 3, marginTop: -px }} />
      </div>

      {/* ── Left tree ────────────────────────────────── */}
      <div className="absolute animate-tree-sway" style={{ left: px, top: px * 18, imageRendering: 'pixelated' }}>
        {/* Trunk */}
        <div className="absolute bg-[#8B7355]" style={{ left: px * 2, top: px * 5, width: px * 2, height: px * 6 }} />
        {/* Canopy layers */}
        <div className="absolute bg-[#059669]" style={{ left: 0, top: px * 2, width: px * 6, height: px * 2 }} />
        <div className="absolute bg-[#047857]" style={{ left: px, top: 0, width: px * 4, height: px * 2 }} />
        <div className="absolute bg-[#34D399]" style={{ left: px * 2, top: px * 3, width: px * 2, height: px * 2 }} />
      </div>

      {/* ── Right tree ───────────────────────────────── */}
      {!compact && (
        <div className="absolute animate-tree-sway" style={{ right: px, top: px * 22, imageRendering: 'pixelated', animationDelay: '1.5s' }}>
          <div className="absolute bg-[#8B7355]" style={{ left: px * 2, top: px * 4, width: px * 2, height: px * 5 }} />
          <div className="absolute bg-[#047857]" style={{ left: 0, top: px * 1, width: px * 6, height: px * 2 }} />
          <div className="absolute bg-[#059669]" style={{ left: px, top: 0, width: px * 4, height: px * 2 }} />
          <div className="absolute bg-[#10B981]" style={{ left: px * 2, top: px * 2, width: px * 2, height: px * 2 }} />
        </div>
      )}

      {/* ── Path (vertical trail) ────────────────────── */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: px * 20,
          width: px * 4,
          bottom: px * 20,
          background: `repeating-linear-gradient(180deg, #A0845C ${px}px, #8B7355 ${px}px, #8B7355 ${px * 2}px, #A0845C ${px * 2}px)`,
          opacity: 0.3,
          imageRendering: 'pixelated',
        }}
      />

      {/* ── Flowers (bottom area) ────────────────────── */}
      <div className="absolute bottom-[72px] left-0 right-0 flex justify-around px-2" style={{ imageRendering: 'pixelated' }}>
        {/* Flower 1 */}
        <div className="flex flex-col items-center">
          <div className="bg-[#F472B6]" style={{ width: px * 2, height: px * 2 }} />
          <div className="bg-[#059669]" style={{ width: px, height: px * 3 }} />
        </div>
        {/* Bush */}
        <div className="flex gap-0">
          <div className="bg-[#10B981]" style={{ width: px * 2, height: px * 3 }} />
          <div className="bg-[#059669]" style={{ width: px * 2, height: px * 4 }} />
          <div className="bg-[#34D399]" style={{ width: px * 2, height: px * 3 }} />
        </div>
        {/* Flower 2 */}
        <div className="flex flex-col items-center">
          <div className="bg-[#FBBF24]" style={{ width: px * 2, height: px * 2 }} />
          <div className="bg-[#059669]" style={{ width: px, height: px * 3 }} />
        </div>
      </div>

      {/* ── Gardener (bottom, animated idle) ──────────── */}
      <div className="absolute bottom-[28px] left-1/2 -translate-x-1/2 animate-gardener-idle" style={{ imageRendering: 'pixelated' }}>
        <svg width={px * 10} height={px * 12} viewBox={`0 0 ${px * 10} ${px * 12}`} style={{ imageRendering: 'pixelated' }}>
          {/* Hat */}
          <rect x={px * 2} y={0} width={px * 6} height={px} fill="#059669" />
          <rect x={px * 3} y={px} width={px * 4} height={px} fill="#047857" />
          {/* Face */}
          <rect x={px * 3} y={px * 2} width={px * 4} height={px * 2} fill="#F4C99B" />
          {/* Eyes (with blink) */}
          <rect x={px * 4} y={px * 2} width={px} height={px} fill="#1E1E1E" style={{ animation: 'gardener-blink 4s ease-in-out infinite' }} />
          <rect x={px * 6} y={px * 2} width={px} height={px} fill="#1E1E1E" style={{ animation: 'gardener-blink 4s ease-in-out infinite 0.1s' }} />
          {/* Body */}
          <rect x={px * 3} y={px * 4} width={px * 4} height={px * 3} fill="#34D399" />
          {/* Arms */}
          <rect x={px * 2} y={px * 4} width={px} height={px * 2} fill="#F4C99B" />
          <rect x={px * 7} y={px * 4} width={px} height={px * 2} fill="#F4C99B" />
          {/* Pants */}
          <rect x={px * 3} y={px * 7} width={px * 2} height={px * 3} fill="#5B4A3F" />
          <rect x={px * 5} y={px * 7} width={px * 2} height={px * 3} fill="#5B4A3F" />
          {/* Boots */}
          <rect x={px * 2} y={px * 10} width={px * 3} height={px * 2} fill="#3D2E24" />
          <rect x={px * 5} y={px * 10} width={px * 3} height={px * 2} fill="#3D2E24" />
          {/* Shovel */}
          <rect x={px * 8} y={px * 3} width={px} height={px * 6} fill="#8B7355" />
          <rect x={px * 7} y={px * 8} width={px * 3} height={px * 2} fill="#94A3B8" />
        </svg>
      </div>

      {/* ── Ground ───────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0" style={{ imageRendering: 'pixelated' }}>
        {/* Grass */}
        <div className="w-full bg-[#059669]" style={{ height: px * 3 }} />
        {/* Grass detail */}
        <div className="absolute bottom-[12px] left-0 right-0 flex">
          {Array.from({ length: 16 }, (_, i) => (
            <div key={i} className={i % 3 === 0 ? 'bg-[#34D399]' : 'bg-[#10B981]'} style={{ width: px * 2, height: px, flexShrink: 0 }} />
          ))}
        </div>
        {/* Dirt */}
        <div className="w-full bg-[#6B5B45]" style={{ height: px * 2 }} />
        <div className="w-full bg-[#5A4A3A]" style={{ height: px * 2 }} />
      </div>
    </div>
  )
}
