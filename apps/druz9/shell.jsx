/* ============================================================
   druz9 — Persistent shell (hero strip + sidebar + router)
   ============================================================ */

const NAV_ITEMS = [
  { id: 'hub',       label: 'Town Square',   hint: 'Hub',        icon: 'hub' },
  { id: 'profile',   label: 'Hero Chamber',  hint: 'Profile',    icon: 'profile' },
  { id: 'guild',     label: 'Guild Hall',    hint: 'Guild',      icon: 'guild' },
  { id: 'arena',     label: 'Arena',         hint: 'Duels',      icon: 'arena' },
  { id: 'training',  label: 'Workshop',      hint: 'Training',   icon: 'training' },
  { id: 'interview', label: 'Mentor Tower',  hint: 'AI Interview', icon: 'interview' },
  { id: 'leaderboards', label: 'Leaderboards', hint: 'Rankings', icon: 'arena' },
  { id: 'social',    label: 'Friends',       hint: 'Social',     icon: 'profile' },
  { id: 'events',    label: 'Town Board',    hint: 'Events',     icon: 'events' },
  { id: 'podcasts',  label: 'Tavern',        hint: 'Podcasts',   icon: 'podcasts' },
  { id: 'map',       label: 'World Map',     hint: 'Discovery',  icon: 'map' },
  { id: 'shop',      label: 'Merchant',      hint: 'Shop',       icon: 'shop' },
];

function HeroStrip({ user, tweaks }) {
  const roomTheme = tweaks.roomLayout; // 'cozy' | 'scholar' | 'warrior'
  const pose = tweaks.heroPose;         // 'idle' | 'wave' | 'trophy'

  const skyColors = {
    cozy:    'linear-gradient(180deg, #c8a870 0%, #a8844a 55%, #7a5530 100%)',
    scholar: 'linear-gradient(180deg, #6b8a6a 0%, #3d6149 55%, #2d4a35 100%)',
    warrior: 'linear-gradient(180deg, #9a6a3a 0%, #6a4020 55%, #3b2a1a 100%)',
  };

  return (
    <div className="hero-strip" style={{ background: skyColors[roomTheme] }}>
      {/* distant mountain silhouette */}
      <svg viewBox="0 0 800 140" preserveAspectRatio="none"
           style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.35 }}>
        <polygon points="0,140 0,90 80,50 160,80 240,40 320,70 420,30 520,65 620,35 720,70 800,50 800,140" fill="#3b2a1a" />
        <polygon points="0,140 0,110 100,85 200,100 320,80 420,95 520,75 640,95 760,80 800,90 800,140" fill="#1a140e" opacity="0.6" />
      </svg>

      {/* fireflies */}
      <Fireflies count={10} />

      {/* content */}
      <div style={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        alignItems: 'stretch',
        padding: '0 32px',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', paddingRight: 28, borderRight: '3px dashed rgba(246,234,208,0.35)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42,
              background: 'var(--ember-1)',
              border: '3px solid var(--ink-0)',
              boxShadow: 'inset -3px -3px 0 var(--ember-0), inset 3px 3px 0 var(--ember-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Pixelify Sans', fontSize: 22, color: 'var(--parch-0)',
            }}>D9</div>
            <div>
              <div style={{ fontFamily: 'Pixelify Sans', fontSize: 22, color: 'var(--parch-0)', lineHeight: 1 }}>druz9</div>
              <div className="mono" style={{ color: 'var(--parch-2)', fontSize: 9 }}>season III · the ember pact</div>
            </div>
          </div>
        </div>

        {/* Hero + scene */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 24px', position: 'relative' }}>
          {/* tiny scene slice */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, height: '100%', paddingBottom: 6 }}>
            <Torch scale={3} />
            <Hero scale={4} pose={pose} />
            {tweaks.pet === 'slime' && <SlimePet scale={3} />}
            {tweaks.pet === 'raven' && <RavenPet scale={3} />}
            {tweaks.pet === 'orb' && <SpiritOrb scale={3} />}
            <Torch scale={3} />
          </div>

          {/* hero stats */}
          <div style={{ flex: 1, paddingLeft: 28, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <div style={{ fontFamily: 'Pixelify Sans', fontSize: 26, color: 'var(--parch-0)', lineHeight: 1 }}>
                {user.name}
              </div>
              <span className="mono" style={{ color: 'var(--ember-3)' }}>lvl {user.level}</span>
              <span className="mono" style={{ color: 'var(--parch-2)' }}>· {user.title}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span className="stat-chip">🔥 streak {user.streak}d</span>
              <span className="stat-chip">★ {user.achievements}/240</span>
              <span className="stat-chip">⚔ {user.duelsWon}w · {user.duelsLost}l</span>
              <span className="stat-chip" style={{ background: 'rgba(61,97,73,0.55)' }}>
                {user.guild}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <span className="mono" style={{ color: 'var(--parch-2)' }}>xp</span>
              <div className="bar" style={{ flex: 1, maxWidth: 280 }}>
                <div className="bar__fill" style={{ width: `${user.xpPct}%` }} />
              </div>
              <span className="mono" style={{ color: 'var(--parch-0)' }}>{user.xp}/{user.xpMax}</span>
            </div>
          </div>
        </div>

        {/* currencies + profile menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderLeft: '3px dashed rgba(246,234,208,0.35)', paddingLeft: 22 }}>
          <div className="panel panel--dark" style={{ padding: '8px 12px', boxShadow: 'inset 0 0 0 3px #1a140e' }}>
            <div className="mono" style={{ color: 'var(--parch-2)', fontSize: 9 }}>gold</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <PixelCoin scale={2} />
              <span style={{ fontFamily: 'Pixelify Sans', color: 'var(--ember-3)', fontSize: 18 }}>{user.gold.toLocaleString()}</span>
            </div>
          </div>
          <div className="panel panel--dark" style={{ padding: '8px 12px' }}>
            <div className="mono" style={{ color: 'var(--parch-2)', fontSize: 9 }}>gems</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, background: '#8fb8d4', border: '2px solid var(--ink-0)', transform: 'rotate(45deg)' }} />
              <span style={{ fontFamily: 'Pixelify Sans', color: '#d4e2ec', fontSize: 18 }}>{user.gems}</span>
            </div>
          </div>
          <button className="btn btn--sm" style={{ padding: '10px 12px' }}>⚙</button>
        </div>
      </div>
    </div>
  );
}

function SideNav({ current, onNav }) {
  return (
    <nav className="sidenav">
      <div className="sidenav__section">Quest Journal</div>
      {NAV_ITEMS.slice(0, 4).map(item => (
        <NavRow key={item.id} item={item} active={current === item.id} onClick={() => onNav(item.id)} />
      ))}
      <div className="sidenav__section">Practice</div>
      {NAV_ITEMS.slice(4, 8).map(item => (
        <NavRow key={item.id} item={item} active={current === item.id} onClick={() => onNav(item.id)} />
      ))}
      <div className="sidenav__section">World</div>
      {NAV_ITEMS.slice(8).map(item => (
        <NavRow key={item.id} item={item} active={current === item.id} onClick={() => onNav(item.id)} />
      ))}

      <div style={{ marginTop: 20, padding: '12px 10px', border: '3px dashed var(--ink-3)' }}>
        <div className="mono text-mute" style={{ fontSize: 9, marginBottom: 6 }}>today's pact</div>
        <div style={{ fontFamily: 'Pixelify Sans', fontSize: 13, marginBottom: 8 }}>solve 3 medium tasks</div>
        <div className="bar"><div className="bar__fill" style={{ width: '66%' }} /></div>
        <div className="mono text-mute" style={{ fontSize: 9, marginTop: 6 }}>2 / 3 · +120 ✦</div>
      </div>
    </nav>
  );
}

function NavRow({ item, active, onClick }) {
  return (
    <div
      className={`sidenav__item ${active ? 'sidenav__item--active' : ''}`}
      onClick={onClick}
    >
      <span className="sidenav__icon" style={{ color: active ? 'var(--ember-3)' : 'var(--ink-1)' }}>
        <NavIcon kind={item.icon} size={18} color={active ? '#e9b866' : '#5a3f27'} />
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span>{item.label}</span>
        <span className="mono" style={{ fontSize: 9, color: active ? 'var(--parch-2)' : 'var(--ink-3)' }}>
          {item.hint}
        </span>
      </div>
      {item.id === 'events' && (
        <span className="badge badge--ember" style={{ marginLeft: 'auto', fontSize: 9 }}>new</span>
      )}
      {item.id === 'arena' && (
        <span className="badge badge--dark" style={{ marginLeft: 'auto', fontSize: 9 }}>3</span>
      )}
    </div>
  );
}

/* ============================================================
   Page header — subtle crest for each room
   ============================================================ */
function PageHeader({ eyebrow, title, subtitle, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      marginBottom: 20, paddingBottom: 14, borderBottom: '3px dashed var(--ink-3)',
    }}>
      <div>
        <div className="mono" style={{ color: 'var(--ember-1)' }}>{eyebrow}</div>
        <h1 style={{ margin: '4px 0 2px' }}>{title}</h1>
        {subtitle && <div className="text-mute" style={{ maxWidth: 560 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

Object.assign(window, { NAV_ITEMS, HeroStrip, SideNav, PageHeader });
