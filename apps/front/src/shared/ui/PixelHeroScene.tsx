/**
 * Pixel art hero scene — full-width animated header for each section.
 * Pure CSS + inline SVG rects. 5 themes: home, practice, prepare, community, profile.
 */

interface PixelHeroSceneProps {
  scene: 'home' | 'practice' | 'prepare' | 'community' | 'profile'
  className?: string
}

const PX = 4 // pixel size

function Rect({ x, y, w = 1, h = 1, fill, className }: { x: number; y: number; w?: number; h?: number; fill: string; className?: string }) {
  return <rect x={x * PX} y={y * PX} width={w * PX} height={h * PX} fill={fill} className={className} />
}

/* ── Home scene: garden panorama with gardener watering ────── */
function HomeScene() {
  return (
    <svg viewBox={`0 0 ${80 * PX} ${28 * PX}`} className="w-full h-full" style={{ imageRendering: 'pixelated' }} preserveAspectRatio="xMidYMid slice">
      {/* Sky */}
      <rect width="100%" height={20 * PX} fill="#87CEEB" className="dark:fill-[#0B1210]" />

      {/* Sun */}
      <Rect x={68} y={2} w={4} h={4} fill="#FBBF24" />
      <Rect x={67} y={3} w={1} h={2} fill="#FDE68A" />
      <Rect x={72} y={3} w={1} h={2} fill="#FDE68A" />
      <Rect x={69} y={1} w={2} h={1} fill="#FDE68A" />

      {/* Clouds */}
      <g className="animate-cloud">
        <Rect x={10} y={3} w={6} h={2} fill="white" />
        <Rect x={9} y={4} w={1} h={1} fill="white" />
        <Rect x={16} y={4} w={1} h={1} fill="white" />
      </g>
      <g className="animate-cloud" style={{ animationDelay: '8s', animationDuration: '25s' }}>
        <Rect x={35} y={5} w={5} h={2} fill="white" />
        <Rect x={34} y={6} w={1} h={1} fill="white" />
      </g>

      {/* Mountains (background) */}
      <Rect x={0} y={14} w={12} h={6} fill="#065F46" />
      <Rect x={2} y={12} w={8} h={2} fill="#047857" />
      <Rect x={4} y={10} w={4} h={2} fill="#064E3B" />
      <Rect x={60} y={13} w={20} h={7} fill="#065F46" />
      <Rect x={64} y={11} w={12} h={2} fill="#047857" />
      <Rect x={68} y={9} w={4} h={2} fill="#064E3B" />

      {/* Tree left */}
      <g className="animate-tree-sway">
        <Rect x={6} y={14} w={2} h={6} fill="#8B7355" />
        <Rect x={3} y={11} w={8} h={3} fill="#059669" />
        <Rect x={5} y={9} w={4} h={2} fill="#10B981" />
      </g>

      {/* Tree right */}
      <g className="animate-tree-sway" style={{ animationDelay: '2s' }}>
        <Rect x={55} y={14} w={2} h={6} fill="#8B7355" />
        <Rect x={52} y={12} w={8} h={2} fill="#047857" />
        <Rect x={54} y={10} w={4} h={2} fill="#059669" />
      </g>

      {/* Flowers */}
      <Rect x={18} y={19} w={1} h={1} fill="#F472B6" />
      <Rect x={18} y={20} w={1} h={1} fill="#059669" />
      <Rect x={25} y={19} w={1} h={1} fill="#FBBF24" />
      <Rect x={25} y={20} w={1} h={1} fill="#059669" />
      <Rect x={45} y={19} w={1} h={1} fill="#F472B6" />
      <Rect x={45} y={20} w={1} h={1} fill="#059669" />

      {/* Gardener watering (center) */}
      <g className="animate-gardener-idle" style={{ transform: 'translate(0,0)' }}>
        {/* Hat */}
        <Rect x={36} y={13} w={4} h={1} fill="#059669" />
        <Rect x={37} y={14} w={2} h={1} fill="#047857" />
        {/* Face */}
        <Rect x={37} y={15} w={2} h={2} fill="#F4C99B" />
        <Rect x={37} y={15} w={1} h={1} fill="#1E1E1E" />
        {/* Body */}
        <Rect x={37} y={17} w={2} h={2} fill="#34D399" />
        <Rect x={36} y={17} w={1} h={1} fill="#F4C99B" />
        <Rect x={39} y={17} w={1} h={1} fill="#F4C99B" />
        {/* Legs */}
        <Rect x={37} y={19} w={1} h={1} fill="#5B4A3F" />
        <Rect x={38} y={19} w={1} h={1} fill="#5B4A3F" />
        {/* Watering can */}
        <Rect x={40} y={16} w={2} h={2} fill="#94A3B8" />
        <Rect x={41} y={15} w={1} h={1} fill="#94A3B8" />
        {/* Water drops */}
        <Rect x={42} y={17} w={1} h={1} fill="#38BDF8" />
        <Rect x={41} y={18} w={1} h={1} fill="#38BDF8" />
        <Rect x={43} y={18} w={1} h={1} fill="#0EA5E9" />
      </g>

      {/* Ground */}
      <rect y={20 * PX} width="100%" height={3 * PX} fill="#059669" />
      <rect y={23 * PX} width="100%" height={2 * PX} fill="#047857" />
      <rect y={25 * PX} width="100%" height={3 * PX} fill="#6B5B45" />

      {/* Ground grass detail */}
      {Array.from({ length: 20 }, (_, i) => (
        <Rect key={i} x={i * 4} y={20} w={2} h={1} fill="#34D399" />
      ))}
    </svg>
  )
}

/* ── Practice scene: arena with swords and torches ─────────── */
function PracticeScene() {
  return (
    <svg viewBox={`0 0 ${80 * PX} ${28 * PX}`} className="w-full h-full" style={{ imageRendering: 'pixelated' }} preserveAspectRatio="xMidYMid slice">
      {/* Dark sky */}
      <rect width="100%" height={20 * PX} fill="#1A1A2E" className="dark:fill-[#0B1210]" />

      {/* Stars */}
      {[{x:5,y:2},{x:15,y:4},{x:30,y:1},{x:50,y:3},{x:65,y:2},{x:75,y:5}].map((s, i) => (
        <Rect key={i} x={s.x} y={s.y} w={1} h={1} fill="#FDE68A" className="animate-sparkle" />
      ))}

      {/* Arena walls */}
      <Rect x={0} y={12} w={80} h={8} fill="#3D2E24" />
      <Rect x={0} y={10} w={80} h={2} fill="#5A4A3A" />
      {/* Wall detail */}
      {Array.from({ length: 10 }, (_, i) => (
        <Rect key={i} x={i * 8 + 1} y={13} w={6} h={5} fill="#4A3A2A" />
      ))}

      {/* Torches */}
      {[15, 35, 55, 72].map((x, i) => (
        <g key={i}>
          <Rect x={x} y={8} w={1} h={4} fill="#8B7355" />
          <rect x={x * PX - PX / 2} y={6 * PX} width={PX * 2} height={PX * 2} fill="#F59E0B" className="animate-torch" style={{ animationDelay: `${i * 0.15}s` }} />
          <Rect x={x} y={5} w={1} h={1} fill="#EF4444" />
        </g>
      ))}

      {/* Fighter left (sword) */}
      <g className="animate-gardener-idle">
        <Rect x={30} y={13} w={2} h={2} fill="#F4C99B" />
        <Rect x={30} y={15} w={2} h={2} fill="#DC2626" />
        <Rect x={30} y={17} w={1} h={2} fill="#5B4A3F" />
        <Rect x={31} y={17} w={1} h={2} fill="#5B4A3F" />
        <Rect x={32} y={14} w={1} h={4} fill="#94A3B8" /> {/* sword */}
        <Rect x={32} y={13} w={1} h={1} fill="#E2E8F0" />
      </g>

      {/* Fighter right */}
      <g className="animate-gardener-idle" style={{ animationDelay: '0.5s' }}>
        <Rect x={46} y={13} w={2} h={2} fill="#F4C99B" />
        <Rect x={46} y={15} w={2} h={2} fill="#2563EB" />
        <Rect x={46} y={17} w={1} h={2} fill="#5B4A3F" />
        <Rect x={47} y={17} w={1} h={2} fill="#5B4A3F" />
        <Rect x={45} y={14} w={1} h={4} fill="#94A3B8" />
        <Rect x={45} y={13} w={1} h={1} fill="#E2E8F0" />
      </g>

      {/* VS sparks */}
      <Rect x={38} y={14} w={1} h={1} fill="#FBBF24" className="animate-sparkle" />
      <Rect x={39} y={15} w={1} h={1} fill="#FBBF24" className="animate-sparkle" />
      <Rect x={40} y={14} w={1} h={1} fill="#FBBF24" className="animate-sparkle" />

      {/* Arena floor */}
      <rect y={20 * PX} width="100%" height={8 * PX} fill="#5A4A3A" />
      <rect y={20 * PX} width="100%" height={PX} fill="#8B7355" />
    </svg>
  )
}

/* ── Prepare scene: library with books and candles ─────────── */
function PrepareScene() {
  return (
    <svg viewBox={`0 0 ${80 * PX} ${28 * PX}`} className="w-full h-full" style={{ imageRendering: 'pixelated' }} preserveAspectRatio="xMidYMid slice">
      {/* Dark interior */}
      <rect width="100%" height="100%" fill="#2D1F14" className="dark:fill-[#0B1210]" />

      {/* Bookshelves */}
      {[5, 25, 45, 65].map((x, i) => (
        <g key={i}>
          {/* Shelf */}
          <Rect x={x} y={8} w={14} h={1} fill="#8B7355" />
          <Rect x={x} y={15} w={14} h={1} fill="#8B7355" />
          {/* Books row 1 */}
          <Rect x={x + 1} y={3} w={2} h={5} fill="#DC2626" />
          <Rect x={x + 3} y={4} w={2} h={4} fill="#059669" />
          <Rect x={x + 5} y={3} w={1} h={5} fill="#2563EB" />
          <Rect x={x + 6} y={4} w={2} h={4} fill="#FBBF24" />
          <Rect x={x + 8} y={3} w={2} h={5} fill="#7C3AED" />
          <Rect x={x + 10} y={4} w={2} h={4} fill="#059669" />
          {/* Books row 2 */}
          <Rect x={x + 1} y={9} w={2} h={6} fill="#0EA5E9" />
          <Rect x={x + 3} y={10} w={1} h={5} fill="#F59E0B" />
          <Rect x={x + 4} y={9} w={2} h={6} fill="#EC4899" />
          <Rect x={x + 6} y={10} w={2} h={5} fill="#059669" />
          <Rect x={x + 8} y={9} w={2} h={6} fill="#8B5CF6" />
          <Rect x={x + 10} y={10} w={2} h={5} fill="#EF4444" />
        </g>
      ))}

      {/* Candles */}
      {[20, 40, 60].map((x, i) => (
        <g key={i}>
          <Rect x={x} y={16} w={1} h={3} fill="#FDE68A" />
          <rect x={x * PX} y={15 * PX} width={PX} height={PX} fill="#F59E0B" className="animate-torch" style={{ animationDelay: `${i * 0.2}s` }} />
        </g>
      ))}

      {/* Floor */}
      <rect y={20 * PX} width="100%" height={8 * PX} fill="#3D2E24" />
      {Array.from({ length: 10 }, (_, i) => (
        <Rect key={i} x={i * 8} y={20} w={8} h={1} fill={i % 2 === 0 ? '#4A3A2A' : '#5A4A3A'} />
      ))}
    </svg>
  )
}

/* ── Community scene: village with houses and bridge ────────── */
function CommunityScene() {
  return (
    <svg viewBox={`0 0 ${80 * PX} ${28 * PX}`} className="w-full h-full" style={{ imageRendering: 'pixelated' }} preserveAspectRatio="xMidYMid slice">
      {/* Sky */}
      <rect width="100%" height={20 * PX} fill="#87CEEB" className="dark:fill-[#0B1210]" />

      {/* Clouds */}
      <g className="animate-cloud" style={{ animationDuration: '22s' }}>
        <Rect x={20} y={3} w={5} h={2} fill="white" />
        <Rect x={19} y={4} w={1} h={1} fill="white" />
      </g>

      {/* House 1 */}
      <Rect x={5} y={10} w={10} h={10} fill="#D4C8B8" />
      <Rect x={3} y={8} w={14} h={2} fill="#DC2626" /> {/* roof */}
      <Rect x={5} y={7} w={10} h={1} fill="#B91C1C" />
      <Rect x={8} y={14} w={4} h={6} fill="#5A4A3A" /> {/* door */}
      <Rect x={6} y={12} w={2} h={2} fill="#38BDF8" /> {/* window */}
      <Rect x={12} y={12} w={2} h={2} fill="#38BDF8" />

      {/* House 2 */}
      <Rect x={60} y={11} w={12} h={9} fill="#EDE8E0" />
      <Rect x={58} y={9} w={16} h={2} fill="#059669" />
      <Rect x={60} y={8} w={12} h={1} fill="#047857" />
      <Rect x={64} y={14} w={4} h={6} fill="#5A4A3A" />
      <Rect x={61} y={13} w={2} h={2} fill="#38BDF8" />

      {/* Bridge */}
      <Rect x={30} y={17} w={16} h={2} fill="#8B7355" />
      <Rect x={30} y={16} w={2} h={1} fill="#6B5B45" />
      <Rect x={44} y={16} w={2} h={1} fill="#6B5B45" />

      {/* River */}
      <Rect x={28} y={19} w={20} h={1} fill="#0EA5E9" />
      <Rect x={26} y={20} w={24} h={2} fill="#38BDF8" />

      {/* People */}
      <Rect x={22} y={17} w={1} h={2} fill="#F4C99B" />
      <Rect x={22} y={19} w={1} h={1} fill="#059669" />
      <Rect x={50} y={17} w={1} h={2} fill="#F4C99B" />
      <Rect x={50} y={19} w={1} h={1} fill="#2563EB" />

      {/* Ground */}
      <rect y={20 * PX} width="100%" height={3 * PX} fill="#059669" />
      <rect y={23 * PX} width="100%" height={5 * PX} fill="#6B5B45" />
    </svg>
  )
}

/* ── Profile scene: personal garden with house ─────────────── */
function ProfileScene() {
  return (
    <svg viewBox={`0 0 ${80 * PX} ${28 * PX}`} className="w-full h-full" style={{ imageRendering: 'pixelated' }} preserveAspectRatio="xMidYMid slice">
      {/* Sky */}
      <rect width="100%" height={20 * PX} fill="#87CEEB" className="dark:fill-[#0B1210]" />

      {/* Sun */}
      <Rect x={70} y={2} w={3} h={3} fill="#FBBF24" />

      {/* Small house */}
      <Rect x={8} y={11} w={10} h={9} fill="#D4C8B8" />
      <Rect x={6} y={9} w={14} h={2} fill="#8B7355" />
      <Rect x={8} y={8} w={10} h={1} fill="#6B5B45" />
      <Rect x={11} y={14} w={4} h={6} fill="#5A4A3A" />
      <Rect x={9} y={13} w={2} h={2} fill="#38BDF8" />

      {/* Garden plots */}
      {[28, 36, 44, 52, 60].map((x, i) => (
        <g key={i}>
          <Rect x={x} y={18} w={6} h={2} fill="#6B5B45" />
          {/* Plants */}
          <Rect x={x + 1} y={16} w={1} h={2} fill="#059669" />
          <Rect x={x + 3} y={15} w={1} h={3} fill="#10B981" />
          <Rect x={x + 2} y={17} w={1} h={1} fill="#34D399" />
          {i % 2 === 0 && <Rect x={x + 4} y={16} w={1} h={1} fill="#F472B6" />}
        </g>
      ))}

      {/* Fence */}
      {Array.from({ length: 8 }, (_, i) => (
        <g key={i}>
          <Rect x={24 + i * 5} y={17} w={1} h={3} fill="#8B7355" />
          <Rect x={24 + i * 5} y={16} w={1} h={1} fill="#A0845C" />
        </g>
      ))}
      <Rect x={24} y={18} w={40} h={1} fill="#8B7355" />

      {/* Ground */}
      <rect y={20 * PX} width="100%" height={3 * PX} fill="#059669" />
      <rect y={23 * PX} width="100%" height={5 * PX} fill="#6B5B45" />
    </svg>
  )
}

const SCENES = {
  home: HomeScene,
  practice: PracticeScene,
  prepare: PrepareScene,
  community: CommunityScene,
  profile: ProfileScene,
}

export function PixelHeroScene({ scene, className }: PixelHeroSceneProps) {
  const SceneComponent = SCENES[scene]

  return (
    <div className={`relative w-full h-[112px] overflow-hidden pixel-border ${className ?? ''}`}>
      <SceneComponent />
    </div>
  )
}
