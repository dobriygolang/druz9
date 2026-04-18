/* ============================================================
   druz9 — Pixel art primitives
   All sprites drawn as inline SVG with pixel-aligned rects.
   Kept intentionally simple (original, non-branded).
   ============================================================ */

// Utility: render a pixel grid from a string map
// Each char => color key; '.' = transparent
function PixelGrid({ map, palette, scale = 4 }) {
  const rows = map.trim().split('\n');
  const h = rows.length;
  const w = Math.max(...rows.map(r => r.length));
  const cells = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const ch = row[x] || '.';
      if (ch === '.' || ch === ' ') continue;
      const fill = palette[ch];
      if (!fill) continue;
      cells.push(
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />
      );
    }
  });
  return (
    <svg
      width={w * scale}
      height={h * scale}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      style={{ imageRendering: 'pixelated', display: 'block' }}
    >
      {cells}
    </svg>
  );
}

/* -------- Hero character (original — cloaked adventurer) -------- */
const HERO_MAP = `
........HHHHHHHH........
......HHSSSSSSSSHH......
.....HSSFFFSSFFFSSH.....
.....HSFFFFFSFFFSFH.....
.....HSFKKFSSFFKKFH.....
.....HSSFFSFFSFFFSH.....
.....HHSSSSMMSSSSHH.....
......HHCCCCCCHH........
.....CCCCGGCCCCCCC......
....CCCBBBGGBBBCCCCC....
....CBBBBBGGBBBBBBC.....
....CBBBLBBGBBLBBBC.....
....CBBBBBGGBBBBBBC.....
....CBBBBBGGBBBBBBC.....
.....CCCBBGGBBBCCC......
......PPPPGGPPPPPP......
.....PPPPPPPPPPPPP......
.....PP...PP..PPPP......
.....BB...BB...BBB......
.....BB...BB...BBB......
`;
const HERO_PALETTE = {
  H: '#3b2a1a',      // hair outline
  S: '#5a3f27',      // skin shadow / hair
  F: '#e4c8a0',      // face
  K: '#3b2a1a',      // eyes
  M: '#b8692a',      // mouth / scarf knot
  C: '#7a593a',      // cloak outline
  B: '#3d6149',      // cloak body (moss)
  G: '#d48a3c',      // belt / trim ember
  L: '#6b8a6a',      // cloak light
  P: '#3b2a1a',      // boots / trousers
};

function Hero({ scale = 4, pose = 'idle', className = '' }) {
  // pose variants: idle | wave | trophy
  // we keep the same base and add overlay elements for pose
  return (
    <div className={`hero-sprite ${className}`} style={{ display: 'inline-block', position: 'relative' }}>
      <div className="idle-bob">
        <PixelGrid map={HERO_MAP} palette={HERO_PALETTE} scale={scale} />
      </div>
      {pose === 'wave' && (
        <div style={{ position: 'absolute', top: scale * 5, right: -scale * 3 }}>
          <PixelGrid
            map={`..BB..\n.BBBB.\nBBBBBB\n.BBBB.`}
            palette={{ B: '#e4c8a0' }}
            scale={scale}
          />
        </div>
      )}
      {pose === 'trophy' && (
        <div style={{ position: 'absolute', top: -scale * 3, left: scale * 6 }}>
          <PixelGrid
            map={`
EEEEE
EGGGE
EGGGE
.EEE.
..G..
.GGG.
`} palette={{ E: '#7a3d12', G: '#e9b866' }} scale={scale}
          />
        </div>
      )}
    </div>
  );
}

/* -------- Companion pets -------- */
function SlimePet({ scale = 3 }) {
  const map = `
...BBBB...
..BGGGGB..
.BGGWGGGB.
BGGGGGGGB
BGGKGGKGB
BGGGGGGGB
.BBBBBBB.
`;
  const palette = { B: '#2d4a35', G: '#6b8a6a', W: '#9fb89a', K: '#1a140e' };
  return (
    <div className="idle-bob">
      <PixelGrid map={map} palette={palette} scale={scale} />
    </div>
  );
}

function RavenPet({ scale = 3 }) {
  const map = `
...BBBB..
..BBBBBB.
.BBBBBBBB
BBOBBBBB.
BBBBBBB..
.BBBBB...
..YY.....
`;
  const palette = { B: '#1a140e', O: '#e9b866', Y: '#b8692a' };
  return (
    <div className="idle-bob">
      <PixelGrid map={map} palette={palette} scale={scale} />
    </div>
  );
}

function SpiritOrb({ scale = 3 }) {
  const map = `
..BBBB..
.BGGGGB.
BGGWGGGB
BGWWWGGB
BGGGGGGB
.BGGGGB.
..BBBB..
`;
  const palette = { B: '#3b2a1a', G: '#b8692a', W: '#e9b866' };
  return (
    <div className="idle-bob" style={{ filter: 'drop-shadow(0 0 6px rgba(233, 184, 102, 0.7))' }}>
      <PixelGrid map={map} palette={palette} scale={scale} />
    </div>
  );
}

/* -------- Torch / candle -------- */
function Torch({ scale = 3 }) {
  const handle = `
...FF...
...FF...
.FFFFFF.
.F....F.
.F....F.
.FFFFFF.
..WWWW..
..WWWW..
`;
  const flame = `
...RR...
..RYYR..
.RYYYYR.
.RYWWYR.
.RYYYYR.
..RYYR..
...RR...
`;
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div className="flicker" style={{ position: 'absolute', left: -scale, top: -scale * 6 }}>
        <PixelGrid map={flame} palette={{ R: '#b8692a', Y: '#d48a3c', W: '#f6ead0' }} scale={scale} />
      </div>
      <PixelGrid map={handle} palette={{ F: '#5a3f27', W: '#3b2a1a' }} scale={scale} />
      <div
        className="glow"
        style={{
          position: 'absolute',
          width: scale * 24,
          height: scale * 24,
          left: -scale * 8,
          top: -scale * 14,
          background: 'radial-gradient(circle, rgba(233,184,102,0.5) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

/* -------- Static room elements -------- */
function Bookshelf({ scale = 3 }) {
  const map = `
FFFFFFFFFFFF
FBRRBGGBBRRF
FBRRBGGBBRRF
FBRRBGGBBRRF
FFFFFFFFFFFF
FRRBBRRBGGBF
FRRBBRRBGGBF
FRRBBRRBGGBF
FFFFFFFFFFFF
FGGRRBBRRBBF
FGGRRBBRRBBF
FGGRRBBRRBBF
FFFFFFFFFFFF
`;
  return <PixelGrid map={map} palette={{ F: '#3b2a1a', B: '#5a3f27', R: '#b8692a', G: '#3d6149' }} scale={scale} />;
}

function Chest({ scale = 3, open = false }) {
  const map = open ? `
.FFFFFFFFF.
FGGGGGGGGGF
F.YYYYYYY.F
F.YYYYYYY.F
FBBBBBBBBBF
FBGGBBBGGBF
FBBBBBBBBBF
FBBBBBBBBBF
FFFFFFFFFFF
` : `
.FFFFFFFFF.
FBBBBBBBBBF
FBGGBBBGGBF
FBBBBBBBBBF
FFFFFFFFFFF
FBBBBBBBBBF
FBGGBBBGGBF
FBBBBBBBBBF
FFFFFFFFFFF
`;
  return <PixelGrid map={map} palette={{ F: '#3b2a1a', B: '#7a593a', G: '#d48a3c', Y: '#e9b866' }} scale={scale} />;
}

function Banner({ scale = 3, crest = '★', color = '#3d6149' }) {
  const map = `
FFFFFFFFF
FRRRRRRRF
FR......RF
FR......RF
FR......RF
FR......RF
FR......RF
FR......RF
.F......F.
..F....F..
...F..F...
....FF....
`;
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <PixelGrid map={map} palette={{ F: '#3b2a1a', R: color }} scale={scale} />
      <div
        style={{
          position: 'absolute',
          left: 0, right: 0, top: scale * 3,
          textAlign: 'center',
          fontFamily: 'Pixelify Sans, monospace',
          fontSize: scale * 4,
          color: '#e9b866',
          fontWeight: 700,
          pointerEvents: 'none',
        }}
      >
        {crest}
      </div>
    </div>
  );
}

function Rug({ scale = 3, w = 30 }) {
  // simple striped pixel rug
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{
          height: scale,
          width: scale * w,
          background: i === 0 || i === 3 ? '#5a3f27' : i === 1 ? '#b8692a' : '#d48a3c',
          borderLeft: `${scale}px solid #3b2a1a`,
          borderRight: `${scale}px solid #3b2a1a`,
          boxSizing: 'border-box',
        }} />
      ))}
    </div>
  );
}

function Window({ scale = 3, night = false }) {
  const map = `
FFFFFFFFFFF
FBBBBGBBBBF
FBBBBGBBBBF
FBBBBGBBBBF
FGGGGGGGGGF
FBBBBGBBBBF
FBBBBGBBBBF
FBBBBGBBBBF
FFFFFFFFFFF
`;
  const palette = night
    ? { F: '#3b2a1a', B: '#2a3a5a', G: '#5a3f27' }
    : { F: '#3b2a1a', B: '#8fb8d4', G: '#5a3f27' };
  return <PixelGrid map={map} palette={palette} scale={scale} />;
}

function Fireplace({ scale = 3 }) {
  const frame = `
FFFFFFFFFFF
FSSSSSSSSSF
FSKKKKKKKSF
FSKRRYRKKSF
FSKRYWYRKSF
FSKKRRRKKSF
FSSSSSSSSSF
FFFFFFFFFFF
`;
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <PixelGrid map={frame} palette={{ F: '#3b2a1a', S: '#5a3f27', K: '#1a140e', R: '#b8692a', Y: '#d48a3c', W: '#e9b866' }} scale={scale} />
      <div
        className="glow"
        style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 50% 60%, rgba(233,184,102,0.4), transparent 60%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

function Statue({ scale = 3, color = '#9fb89a' }) {
  const map = `
..SSSS..
.SSSSSS.
.SFFFFS.
.SFKKFS.
.SFFFFS.
..SBBS..
.SSBBSS.
SSSSSSSS
SSBBBBSS
SSBBBBSS
PPPPPPPP
`;
  return <PixelGrid map={map} palette={{ S: color, F: '#dcc690', K: '#3b2a1a', B: '#5a3f27', P: '#7a593a' }} scale={scale} />;
}

function Trophy({ scale = 3, tier = 'gold' }) {
  const c = tier === 'gold' ? '#d48a3c' : tier === 'silver' ? '#9fb89a' : '#b8692a';
  const h = tier === 'gold' ? '#e9b866' : tier === 'silver' ? '#dcc690' : '#d48a3c';
  const map = `
.CCCCCCC.
CHHHHHHHC
CHHCCCHHC
CHHHHHHHC
.CCCCCCC.
....C....
....C....
..CCCCC..
.CCCCCCC.
`;
  return <PixelGrid map={map} palette={{ C: c, H: h }} scale={scale} />;
}

function PixelCoin({ scale = 2 }) {
  const map = `
.FFFF.
FHHHHF
FHGGHF
FHGGHF
FHHHHF
.FFFF.
`;
  return <PixelGrid map={map} palette={{ F: '#3b2a1a', H: '#e9b866', G: '#b8692a' }} scale={scale} />;
}

function Sword({ scale = 3 }) {
  const map = `
....SS....
....SS....
....SS....
...WSSW...
...WSSW...
...WSSW...
...WSSW...
.HHHSSHHH.
.HHHSSHHH.
...GGGG...
...GGGG...
....BB....
....BB....
`;
  return <PixelGrid map={map} palette={{ S: '#dcc690', W: '#9fb89a', H: '#7a593a', G: '#b8692a', B: '#3b2a1a' }} scale={scale} />;
}

function Potion({ scale = 3, color = '#b8692a' }) {
  const map = `
..BBB..
..BWB..
..BWB..
.BBBBB.
BCCCCCB
BCWCCCB
BCCCCCB
BCCCCCB
.BBBBB.
`;
  return <PixelGrid map={map} palette={{ B: '#3b2a1a', W: '#dcc690', C: color }} scale={scale} />;
}

/* -------- Room scene composer -------- */
function RoomScene({ variant = 'cozy', children, height = 260 }) {
  // variant: cozy | scholar | warrior
  const wallColors = {
    cozy: { wall: '#dcc690', floor: '#7a593a', trim: '#5a3f27' },
    scholar: { wall: '#6b8a6a', floor: '#3d6149', trim: '#2d4a35' },
    warrior: { wall: '#a88850', floor: '#5a3f27', trim: '#3b2a1a' },
  }[variant];

  return (
    <div style={{
      position: 'relative',
      height,
      background: `linear-gradient(180deg, ${wallColors.wall} 0%, ${wallColors.wall} 62%, ${wallColors.floor} 62%, ${wallColors.floor} 100%)`,
      border: '4px solid var(--ink-0)',
      boxShadow: 'inset 0 -14px 0 rgba(59,42,26,0.25), inset 0 4px 0 rgba(246,234,208,0.2), 4px 4px 0 var(--ink-0)',
      overflow: 'hidden',
    }}>
      {/* floorboards */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%',
        backgroundImage: `repeating-linear-gradient(90deg, transparent 0 46px, ${wallColors.trim} 46px 48px)`,
        opacity: 0.5,
      }} />
      {/* wall line */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: '62%',
        height: 4, background: wallColors.trim,
      }} />
      {children}
    </div>
  );
}

/* -------- Icons (navigation) -------- */
function NavIcon({ kind, size = 20, color = 'currentColor' }) {
  const maps = {
    hub: `
.FFFFF.
FFFFFFF
FFFFFFF
FFFFFFF
.FFFFF.
..FFF..
`,
    profile: `
..FFF..
.FFFFF.
.FFFFF.
..FFF..
.FFFFF.
FFFFFFF
FFFFFFF
`,
    guild: `
FFFFFFF
FF.F.FF
F.FFF.F
FFFFFFF
F.FFF.F
FF.F.FF
FFFFFFF
`,
    arena: `
FF...FF
FFF.FFF
.FFFFF.
..FFF..
.FFFFF.
FFF.FFF
FF...FF
`,
    training: `
....FF.
...FFF.
..FFFF.
.FFF...
FFFF...
.FF....
F......
`,
    interview: `
.FFFFF.
FFFFFFF
FFFFFFF
.FFFFF.
...F...
.FFFFF.
F..F..F
`,
    events: `
.F...F.
FFFFFFF
FFFFFFF
F.FF.FF
FFFFFFF
F..FF.F
FFFFFFF
`,
    podcasts: `
.FFFFF.
FFFFFFF
FF.F.FF
FFFFFFF
.FFFFF.
...F...
.FFFFF.
`,
    map: `
FFFFFFF
F.FFF.F
FFF.FFF
F.FFF.F
FFF.FFF
F.FFF.F
FFFFFFF
`,
    shop: `
FFFFFFF
F.FFF.F
FFFFFFF
FFFFFFF
FF...FF
FF...FF
FF...FF
`,
  };
  const map = maps[kind] || maps.hub;
  return <PixelGrid map={map} palette={{ F: color }} scale={Math.ceil(size / 7)} />;
}

/* -------- Firefly cluster (ambient) -------- */
function Fireflies({ count = 8 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="firefly"
          style={{
            left: `${(i * 37) % 100}%`,
            top: `${30 + (i * 17) % 60}%`,
            animationDelay: `${(i * 0.7) % 5}s`,
            animationDuration: `${4 + (i % 3)}s`,
          }}
        />
      ))}
    </>
  );
}

Object.assign(window, {
  PixelGrid, Hero, SlimePet, RavenPet, SpiritOrb,
  Torch, Bookshelf, Chest, Banner, Rug, Window, Fireplace, Statue,
  Trophy, PixelCoin, Sword, Potion, RoomScene, NavIcon, Fireflies,
});
