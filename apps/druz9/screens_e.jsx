/* ============================================================
   druz9 — Sprint 2 extras: Map, Leaderboards, Visitor profile
   ============================================================ */

function MapScreen() {
  const pins = [
    { x: 22, y: 40, n: 'Mossveil', type: 'guild-you', count: 24 },
    { x: 45, y: 28, n: 'Red Ravens', type: 'guild-rival', count: 31 },
    { x: 68, y: 55, n: 'Ashford Academy', type: 'city', count: 112 },
    { x: 82, y: 30, n: 'Duskspire', type: 'city', count: 86 },
    { x: 30, y: 70, n: 'Oakhollow', type: 'guild', count: 18 },
    { x: 58, y: 78, n: 'Thornfield', type: 'guild', count: 22 },
    { x: 12, y: 62, n: 'Silver Hand', type: 'guild', count: 14 },
    { x: 50, y: 50, n: 'Town Square', type: 'event', count: 0 },
    { x: 75, y: 72, n: 'Harvest Festival', type: 'event', count: 0 },
  ];
  const [selected, setSelected] = React.useState(pins[0]);

  return (
    <div>
      <PageHeader
        eyebrow="WORLD MAP · adventurer registry"
        title="The Known World"
        subtitle="Карта гильдий, городов и ивентов druz9. Найди ближайшее сообщество или разузнай соперника."
        right={
          <div className="row gap-2">
            <input placeholder="search adventurer or guild..." style={{ padding: '8px 10px', border: '3px solid var(--ink-0)', background: 'var(--parch-0)', fontFamily: 'IBM Plex Sans', width: 260 }} />
            <button className="btn btn--primary btn--sm">filter</button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18 }}>
        {/* Map */}
        <div className="panel" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            height: 520,
            position: 'relative',
            background: `
              radial-gradient(circle at 30% 40%, rgba(107,138,106,0.3) 0%, transparent 40%),
              radial-gradient(circle at 70% 60%, rgba(184,105,42,0.25) 0%, transparent 40%),
              repeating-linear-gradient(45deg, #dcc690 0 2px, transparent 2px 6px),
              #ecdcb2
            `,
            backgroundBlendMode: 'multiply',
          }}>
            {/* decorative regions */}
            <svg viewBox="0 0 100 60" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.55 }}>
              <path d="M 5 35 Q 15 20 28 22 T 48 18 T 70 22 T 92 28 L 95 58 L 5 58 Z" fill="#6b8a6a" />
              <path d="M 40 15 Q 50 8 62 12 T 85 10 T 95 18 L 95 25 L 40 30 Z" fill="#3d6149" />
              <path d="M 60 45 Q 72 50 80 48 T 95 52 L 95 58 L 60 58 Z" fill="#b8692a" opacity="0.5" />
            </svg>

            {/* grid overlay */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 60px, rgba(59,42,26,0.1) 60px 61px), repeating-linear-gradient(0deg, transparent 0 60px, rgba(59,42,26,0.1) 60px 61px)' }} />

            {/* pins */}
            {pins.map((p, i) => {
              const size = p.type.includes('guild') ? 22 : p.type === 'event' ? 20 : 28;
              const c = p.type === 'guild-you' ? 'var(--moss-1)' : p.type === 'guild-rival' ? 'var(--danger)' : p.type === 'event' ? 'var(--ember-1)' : 'var(--ink-0)';
              return (
                <div key={i} onClick={() => setSelected(p)} style={{
                  position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
                  transform: 'translate(-50%, -50%)',
                  cursor: 'pointer',
                }}>
                  <div style={{
                    width: size, height: size, background: c,
                    border: '3px solid var(--ink-0)',
                    boxShadow: '2px 2px 0 var(--ink-0)',
                    outline: selected === p ? '3px solid var(--ember-3)' : 'none',
                    outlineOffset: 2,
                  }} />
                  <div style={{
                    position: 'absolute', top: size + 4, left: '50%', transform: 'translateX(-50%)',
                    fontFamily: 'Silkscreen', fontSize: 9,
                    background: 'var(--parch-0)', border: '2px solid var(--ink-0)',
                    padding: '1px 4px', whiteSpace: 'nowrap',
                  }}>{p.n}</div>
                </div>
              );
            })}

            <Fireflies count={8} />
          </div>
          <div style={{ padding: 12, borderTop: '3px dashed var(--ink-3)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span className="badge badge--moss">your guild</span>
            <span className="badge" style={{ background: 'var(--danger)', color: 'var(--parch-0)' }}>rival</span>
            <span className="badge badge--ember">event</span>
            <span className="badge badge--dark">city</span>
            <span className="badge">guild</span>
          </div>
        </div>

        {/* List */}
        <div className="panel" style={{ padding: 0, height: 572, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', borderBottom: '3px dashed var(--ink-3)' }}>
            <h3>Registry</h3>
            <div className="mono text-mute" style={{ fontSize: 9 }}>pin selected: {selected.n}</div>
          </div>
          <div style={{ overflow: 'auto', flex: 1, padding: '6px 0' }}>
            {[
              { k: 'GUILDS NEARBY', items: pins.filter(p => p.type.startsWith('guild')) },
              { k: 'CITIES', items: pins.filter(p => p.type === 'city') },
              { k: 'EVENTS', items: pins.filter(p => p.type === 'event') },
            ].map(sec => (
              <div key={sec.k}>
                <div className="sidenav__section" style={{ margin: '4px 10px' }}>{sec.k}</div>
                {sec.items.map((p, i) => (
                  <div key={i} onClick={() => setSelected(p)} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 14px',
                    background: selected === p ? 'var(--parch-2)' : 'transparent',
                    borderLeft: selected === p ? '4px solid var(--ember-1)' : '4px solid transparent',
                    cursor: 'pointer',
                  }}>
                    <div style={{ width: 14, height: 14, background: p.type === 'guild-you' ? 'var(--moss-1)' : p.type === 'guild-rival' ? 'var(--danger)' : p.type === 'event' ? 'var(--ember-1)' : 'var(--ink-0)', border: '2px solid var(--ink-0)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Pixelify Sans', fontSize: 13 }}>{p.n}</div>
                      {p.count > 0 && <div className="mono text-mute" style={{ fontSize: 9 }}>{p.count} adventurers</div>}
                    </div>
                    <button className="btn btn--sm">visit</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LeaderboardsScreen() {
  const [tab, setTab] = React.useState('arena');
  const rows = {
    arena: [
      ['kyrie.dev', 'Red Ravens', 2340, 'mythic', '+12 today'],
      ['glowbeacon', 'Duskspire', 2190, 'grandmaster', '+8'],
      ['thornmoss', 'Mossveil', 1847, 'master', '+24', true],
      ['lunarfox', 'Mossveil', 1820, 'master', '-4'],
      ['oakleaf', 'Mossveil', 1710, 'diamond', '+16'],
      ['petrogryph', 'Red Ravens', 1690, 'diamond', '+2'],
      ['fernglade', 'Silver Hand', 1620, 'diamond', '+9'],
      ['velvaine', 'Mossveil', 1580, 'platinum', '+14'],
    ],
    guilds: [
      ['Duskspire', 112, 8240, '+180 today'],
      ['Ashford Academy', 96, 7120, '+140'],
      ['Red Ravens', 31, 5680, '+90'],
      ['Mossveil', 24, 4820, '+120', true],
      ['Thornfield', 22, 4310, '+60'],
      ['Oakhollow', 18, 3720, '+30'],
    ],
    season: [
      ['thornmoss', 'Mossveil', 18420, '128 trophies'],
      ['kyrie.dev', 'Red Ravens', 17120, '104 trophies'],
      ['glowbeacon', 'Duskspire', 16040, '92 trophies'],
      ['velvaine', 'Mossveil', 14820, '74 trophies'],
    ],
  };

  return (
    <div>
      <PageHeader
        eyebrow="REGISTRY · leaderboards"
        title="The Grand Ledger"
        subtitle="Сезонные лидеры по арене, гильдиям и общей активности."
        right={<span className="mono text-mute">season III · 19 days left</span>}
      />
      <div className="tabs">
        {[['arena', 'Arena ELO'], ['guilds', 'Guilds'], ['season', 'Season XP']].map(([id, t]) => (
          <div key={id} className={`tab ${tab === id ? 'tab--active' : ''}`} onClick={() => setTab(id)}>{t}</div>
        ))}
      </div>
      <div className="panel">
        {(rows[tab] || []).map((r, i) => {
          const isYou = r[r.length - 1] === true;
          return (
            <div key={i} style={{
              display: 'grid',
              gridTemplateColumns: tab === 'guilds' ? '40px 1fr 80px 100px 120px' : '40px 1fr 140px 90px 100px',
              alignItems: 'center', gap: 10,
              padding: '10px 12px',
              background: i < 3 ? `linear-gradient(90deg, rgba(233,184,102,${0.18 - i * 0.05}) 0%, transparent 40%)` : isYou ? 'rgba(184,105,42,0.1)' : 'transparent',
              borderBottom: '1px dashed var(--ink-3)',
              borderLeft: isYou ? '4px solid var(--ember-1)' : 'none',
            }}>
              <span style={{ fontFamily: 'Pixelify Sans', fontSize: 20, color: i === 0 ? 'var(--ember-1)' : i === 1 ? 'var(--ink-2)' : i === 2 ? 'var(--r-legendary)' : 'var(--ink-1)' }}>#{i + 1}</span>
              {tab === 'guilds' ? (
                <>
                  <div style={{ fontFamily: 'Pixelify Sans' }}>{r[0]} {isYou && <span className="badge badge--ember" style={{ fontSize: 9 }}>you</span>}</div>
                  <span className="mono">{r[1]} mems</span>
                  <span className="mono">{r[2]} pts</span>
                  <span className="mono text-moss">{r[3]}</span>
                </>
              ) : (
                <>
                  <div>
                    <div style={{ fontFamily: 'Pixelify Sans' }}>{r[0]} {isYou && <span className="badge badge--ember" style={{ fontSize: 9 }}>you</span>}</div>
                    <div className="mono text-mute" style={{ fontSize: 9 }}>{r[1]}</div>
                  </div>
                  {tab === 'arena' ? (
                    <>
                      <span className="mono">{r[3]}</span>
                      <span className="mono" style={{ color: 'var(--ember-1)', fontFamily: 'Pixelify Sans', fontSize: 18 }}>{r[2]}</span>
                      <span className="mono text-moss">{r[4]}</span>
                    </>
                  ) : (
                    <>
                      <span className="mono" style={{ fontFamily: 'Pixelify Sans', fontSize: 18 }}>{r[2]}</span>
                      <span className="mono text-mute">{r[3]}</span>
                      <span />
                    </>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { MapScreen, LeaderboardsScreen });
