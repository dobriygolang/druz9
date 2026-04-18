/* ============================================================
   druz9 — Guild Hall + Shop + Arena + Design System
   ============================================================ */

function GuildScreen({ tweaks }) {
  const hallTheme = tweaks.guildHallTheme; // 'moss' | 'ember' | 'stone'
  const wallColor = { moss: '#3d6149', ember: '#7a3d12', stone: '#5a5a5a' }[hallTheme];
  const floorColor = { moss: '#2d4a35', ember: '#5a2808', stone: '#3a3a3a' }[hallTheme];

  return (
    <div>
      <PageHeader
        eyebrow="GUILD HALL · mossveil"
        title="Guild Hall of Mossveil"
        subtitle="Общий зал. Украшение, трофеи и монументы отражают силу гильдии в сезоне."
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn--sm">invite</button>
            <button className="btn btn--primary btn--sm">customize hall</button>
          </div>
        }
      />

      {/* Hall scene */}
      <div className="panel panel--nailed" style={{ padding: 0, overflow: 'hidden', marginBottom: 18, position: 'relative' }}>
        <div style={{
          height: 360,
          position: 'relative',
          background: `linear-gradient(180deg, ${wallColor} 0%, ${wallColor} 58%, ${floorColor} 58%, ${floorColor} 100%)`,
          borderBottom: '4px solid var(--ink-0)',
          overflow: 'hidden',
        }}>
          {/* wall pattern */}
          <div style={{
            position: 'absolute', inset: 0, top: 0, height: '58%',
            backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 58px, rgba(0,0,0,0.18) 58px 60px)',
          }} />
          {/* floor tiles */}
          <div style={{
            position: 'absolute', inset: 0, top: '58%',
            backgroundImage: `repeating-linear-gradient(90deg, transparent 0 72px, rgba(0,0,0,0.3) 72px 74px), repeating-linear-gradient(0deg, transparent 0 40px, rgba(0,0,0,0.2) 40px 42px)`,
          }} />

          {/* left column */}
          <div style={{ position: 'absolute', left: 30, bottom: 14, display: 'flex', alignItems: 'flex-end', gap: 14 }}>
            <Statue scale={4} color="#c7ab6e" />
            <Torch scale={4} />
          </div>

          {/* Central banner + crest */}
          <div style={{ position: 'absolute', left: '50%', top: 20, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Banner scale={4} color={wallColor === '#3d6149' ? '#2d4a35' : wallColor} crest="✦" />
            <div className="mono text-light" style={{ marginTop: 4, fontSize: 10 }}>mossveil — ember pact</div>
          </div>

          {/* war table */}
          <div style={{ position: 'absolute', left: '50%', bottom: 16, transform: 'translateX(-50%)' }}>
            <div style={{
              width: 180, height: 60,
              background: '#5a3f27',
              border: '4px solid var(--ink-0)',
              boxShadow: 'inset 4px 4px 0 #7a593a, inset -4px -4px 0 #3b2a1a',
              position: 'relative',
            }}>
              <div style={{ position: 'absolute', inset: 8, background: '#dcc690', border: '2px solid var(--ink-0)' }}>
                <svg viewBox="0 0 100 40" style={{ width: '100%', height: '100%' }}>
                  <path d="M 10 30 Q 30 10 50 20 T 90 15" fill="none" stroke="#7a3d12" strokeWidth="2" strokeDasharray="3 2" />
                  <circle cx="10" cy="30" r="3" fill="#3d6149" stroke="#3b2a1a" strokeWidth="1" />
                  <circle cx="50" cy="20" r="3" fill="#b8692a" stroke="#3b2a1a" strokeWidth="1" />
                  <circle cx="90" cy="15" r="4" fill="#a23a2a" stroke="#3b2a1a" strokeWidth="1" />
                </svg>
              </div>
              <div className="mono text-light" style={{ position: 'absolute', top: -18, left: 0, right: 0, textAlign: 'center', fontSize: 9 }}>war table</div>
            </div>
          </div>

          {/* right column — trophies */}
          <div style={{ position: 'absolute', right: 30, bottom: 14, display: 'flex', alignItems: 'flex-end', gap: 14 }}>
            <Torch scale={4} />
            <Trophy scale={4} tier="gold" />
            <Trophy scale={4} tier="silver" />
            <Statue scale={4} color="#c7ab6e" />
          </div>

          {/* sitting members */}
          <div style={{ position: 'absolute', left: '32%', bottom: 10 }}><Hero scale={3} /></div>
          <div style={{ position: 'absolute', right: '32%', bottom: 10 }}><Hero scale={3} pose="wave" /></div>

          <Fireflies count={12} />

          <div style={{ position: 'absolute', left: 16, bottom: 12 }}>
            <span className="badge badge--dark">hall theme · {hallTheme}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 18 }}>
        {/* Left: campaign + members */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <h3>Active campaign · Siege of the Red Ravens</h3>
              <span className="mono">38h left</span>
            </div>
            <div className="mono text-mute mb-3">Гильдия соперник: Red Ravens · rank 12 · веч. окно 18:00–02:00</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', alignItems: 'center', gap: 12 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'Pixelify Sans', fontSize: 18, color: 'var(--moss-1)' }}>Mossveil</div>
                <div style={{ fontFamily: 'Pixelify Sans', fontSize: 36 }}>2150</div>
                <div className="mono text-mute">you</div>
              </div>
              <div style={{ fontFamily: 'Pixelify Sans', fontSize: 24, textAlign: 'center' }}>⚔</div>
              <div>
                <div style={{ fontFamily: 'Pixelify Sans', fontSize: 18, color: 'var(--danger)' }}>Red Ravens</div>
                <div style={{ fontFamily: 'Pixelify Sans', fontSize: 36 }}>1920</div>
                <div className="mono text-mute">rival</div>
              </div>
            </div>
            <div className="bar mt-3"><div className="bar__fill bar__fill--moss" style={{ width: '53%' }} /></div>
            <div className="divider" />
            <div className="mono text-mute mb-2">reward chest on victory</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { t: 'Seasonal relic', r: 'legendary', icon: <Trophy scale={2} tier="gold" /> },
                { t: 'Hall banner skin', r: 'epic', icon: <Banner scale={2} color="#7a3d12" /> },
                { t: 'Raven totem', r: 'rare', icon: <RavenPet scale={2} /> },
                { t: '500 ember shards', r: 'uncommon', icon: <div style={{ width: 18, height: 18, background: 'var(--ember-2)' }} /> },
              ].map((r, i) => (
                <div key={i} className={`item-card rarity-border--${r.r}`} style={{ flex: 1 }}>
                  <div className="item-card__art">{r.icon}</div>
                  <div style={{ fontFamily: 'Pixelify Sans', fontSize: 11, marginTop: 4 }}>{r.t}</div>
                  <div className={`rarity rarity--${r.r}`}>{r.r}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <h3>Members · 24</h3>
              <div className="row gap-2">
                <span className="badge">online 9</span>
                <span className="badge badge--moss">in-arena 3</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {[
                ['thornmoss', 'officer', 42, true, 'you'],
                ['lunarfox', 'officer', 38, true, 'on duel'],
                ['kyrie.dev', 'member', 27, true, 'training'],
                ['oakleaf', 'member', 24, false, '3h ago'],
                ['velvaine', 'member', 22, true, 'podcast'],
                ['petrogryph', 'member', 19, false, '1d ago'],
                ['nightfern', 'recruit', 14, true, 'arena'],
                ['pipsqueak', 'recruit', 8, true, 'idle'],
              ].map(([n, role, lvl, on, s], i) => (
                <div key={i} style={{
                  padding: 8,
                  background: 'var(--parch-0)',
                  border: '2px solid var(--ink-0)',
                  display: 'flex', flexDirection: 'column', gap: 4,
                  position: 'relative',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 24, height: 24, background: 'var(--parch-2)', border: '2px solid var(--ink-0)', position: 'relative' }}>
                      <div style={{ position: 'absolute', inset: 2, background: 'var(--moss-1)' }} />
                      {on && <div style={{ position: 'absolute', right: -3, bottom: -3, width: 8, height: 8, background: 'var(--success)', border: '2px solid var(--ink-0)' }} />}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'Pixelify Sans', fontSize: 12 }}>{n}</div>
                      <div className="mono text-mute" style={{ fontSize: 8 }}>{role} · lvl {lvl}</div>
                    </div>
                  </div>
                  <div className="mono text-mute" style={{ fontSize: 9 }}>{s}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: achievements + customization */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="panel">
            <h3>Guild achievements</h3>
            <div className="mono text-mute mb-3">24 / 60 unlocked</div>
            {[
              { t: 'Siegebreaker', d: 'won a seasonal guild war', r: 'legendary' },
              { t: 'United Front', d: '10 duels won in same hour', r: 'epic' },
              { t: 'Tavernkeepers', d: 'hosted 5 book clubs', r: 'rare' },
              { t: 'Trailblazers', d: 'topped weekly leaderboard', r: 'epic' },
            ].map((a, i) => (
              <div key={i} className={`rarity-border--${a.r}`} style={{
                padding: '10px 12px', marginBottom: 6,
                border: '3px solid', borderColor: 'var(--ink-0)',
                background: 'var(--parch-0)',
                display: 'flex', gap: 10, alignItems: 'center',
              }}>
                <Trophy scale={2} tier={a.r === 'legendary' ? 'gold' : 'silver'} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Pixelify Sans', fontSize: 13 }}>{a.t}</div>
                  <div className="mono text-mute" style={{ fontSize: 9 }}>{a.d}</div>
                </div>
                <span className={`rarity rarity--${a.r}`}>{a.r}</span>
              </div>
            ))}
          </div>

          <div className="panel panel--wood">
            <h3 style={{ color: 'var(--parch-0)' }}>Hall customization</h3>
            <div className="mono" style={{ color: 'var(--parch-2)', marginBottom: 10 }}>apply with guild gold</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { t: 'Mossfall theme', r: 'epic', owned: true },
                { t: 'Ember braziers', r: 'rare', owned: true },
                { t: 'Raven banner', r: 'epic', owned: false, p: 1200 },
                { t: 'Victory pillar', r: 'legendary', owned: false, p: 3600 },
              ].map((it, i) => (
                <div key={i} className={`item-card rarity-border--${it.r}`} style={{ background: 'var(--parch-0)' }}>
                  <div className="item-card__art" style={{ overflow: 'hidden' }}>
                    {i === 0 && <RoomScene variant="scholar" height={70}><div style={{ position: 'absolute', left: 10, bottom: 2 }}><Torch scale={2} /></div></RoomScene>}
                    {i === 1 && <Torch scale={3} />}
                    {i === 2 && <Banner scale={2} color="#a23a2a" />}
                    {i === 3 && <Trophy scale={3} tier="gold" />}
                  </div>
                  <div style={{ fontFamily: 'Pixelify Sans', fontSize: 11, marginTop: 4 }}>{it.t}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={`rarity rarity--${it.r}`}>{it.r}</span>
                    {it.owned ? <span className="mono text-moss">EQUIPPED</span> : <span className="coin"><span className="coin-icon" />{it.p}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Shop
   ============================================================ */
function ShopScreen({ tweaks, onNav }) {
  const [cat, setCat] = React.useState('decor');
  const [selected, setSelected] = React.useState('moonveil');

  const catalog = {
    decor: [
      { id: 'oakshelf', name: 'Oakwood shelf', r: 'common', p: 90, icon: <Bookshelf scale={2} /> },
      { id: 'ember-brazier', name: 'Ember brazier', r: 'uncommon', p: 220, icon: <Torch scale={2} /> },
      { id: 'silver-window', name: 'Silver dusk window', r: 'rare', p: 380, icon: <Window scale={2} night /> },
      { id: 'fireplace', name: 'Crimson fireplace', r: 'epic', p: 720, icon: <Fireplace scale={2} /> },
      { id: 'moss-rug', name: 'Mossvale rug', r: 'uncommon', p: 140, icon: <Rug scale={2} w={14} /> },
      { id: 'ancestor', name: 'Ancestor statue', r: 'rare', p: 480, icon: <Statue scale={2} /> },
      { id: 'emberglass', name: 'Emberglass chest', r: 'legendary', p: 1480, icon: <Chest scale={2} open /> },
      { id: 'duskbanner', name: 'Dusk banner', r: 'rare', p: 320, icon: <Banner scale={2} color="#7a3d12" /> },
    ],
    cosmetics: [
      { id: 'moonveil', name: 'Moonveil Aura', r: 'epic', p: 480, icon: <SpiritOrb scale={3} /> },
      { id: 'emberward', name: 'Emberward Cloak', r: 'legendary', p: 920, icon: <Hero scale={2} /> },
      { id: 'siegebreaker', name: '"Siegebreaker" title', r: 'rare', p: 280, icon: <Sword scale={2} /> },
      { id: 'oakleaf', name: 'Oakleaf Frame', r: 'uncommon', p: 140, icon: <Banner scale={2} color="#3d6149" /> },
    ],
    ambient: [
      { id: 'fireflies', name: 'Fireflies', r: 'common', p: 80, icon: <div style={{ width: 40, height: 40, background: 'radial-gradient(circle, #e9b866 0%, transparent 70%)' }} /> },
      { id: 'snow', name: 'Snowfall', r: 'uncommon', p: 180, icon: <div style={{ width: 40, height: 40, background: 'repeating-linear-gradient(100deg, transparent 0 6px, #f6ead0 6px 7px)' }} /> },
      { id: 'rain', name: 'Autumn rain', r: 'uncommon', p: 180, icon: <div style={{ width: 40, height: 40 }} className="rain" /> },
      { id: 'mist', name: 'Magical mist', r: 'rare', p: 360, icon: <div style={{ width: 40, height: 40, background: 'radial-gradient(circle, #9fb89a 0%, transparent 70%)' }} /> },
    ],
    pets: [
      { id: 'slime', name: 'Moss Slime', r: 'common', p: 120, icon: <SlimePet scale={2} /> },
      { id: 'raven', name: 'Raven familiar', r: 'rare', p: 260, icon: <RavenPet scale={2} /> },
      { id: 'orb', name: 'Spirit orb', r: 'epic', p: 540, icon: <SpiritOrb scale={2} /> },
    ],
    guild: [
      { id: 'gbanner', name: 'Raven banner', r: 'epic', p: 1200, icon: <Banner scale={2} color="#a23a2a" /> },
      { id: 'pillar', name: 'Victory pillar', r: 'legendary', p: 3600, icon: <Trophy scale={3} tier="gold" /> },
    ],
    seasonal: [
      { id: 'ember-pact', name: 'Ember Pact crown', r: 'legendary', p: 0, p2: '200 shards', icon: <Trophy scale={3} tier="gold" /> },
      { id: 'harvest', name: 'Harvest lantern', r: 'rare', p: 0, p2: 'event drop', icon: <Torch scale={2} /> },
    ],
  };

  const selectedItem = Object.values(catalog).flat().find(i => i.id === selected) || catalog.cosmetics[0];

  return (
    <div>
      <PageHeader
        eyebrow="MERCHANT · mystic shop"
        title="The Merchant of Dusk"
        subtitle="Все предметы — это визуальная демонстрация прогресса. Выбери предмет и посмотри, как он смотрится на герое, в комнате или в гильдии."
        right={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="coin" style={{ fontSize: 14 }}><span className="coin-icon" />8,420</div>
            <button className="btn btn--sm">inventory</button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 360px', gap: 18 }}>
        {/* Categories */}
        <div className="panel panel--recessed" style={{ padding: 10 }}>
          {[
            ['decor', 'Profile decor', '32'],
            ['cosmetics', 'Character cosmetics', '18'],
            ['ambient', 'Ambient effects', '12'],
            ['pets', 'Companions', '9'],
            ['guild', 'Guild decor', '14'],
            ['seasonal', 'Seasonal · event', '6'],
          ].map(([id, label, count]) => (
            <div key={id} onClick={() => setCat(id)} style={{
              padding: '10px 10px',
              marginBottom: 4,
              background: cat === id ? 'var(--ink-0)' : 'var(--parch-0)',
              color: cat === id ? 'var(--parch-0)' : 'var(--ink-0)',
              border: '2px solid var(--ink-0)',
              cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontFamily: 'Pixelify Sans', fontSize: 13,
              boxShadow: cat === id ? '3px 3px 0 var(--ember-1)' : 'none',
            }}>
              <span>{label}</span>
              <span className="mono" style={{ fontSize: 9, opacity: 0.7 }}>{count}</span>
            </div>
          ))}
          <div className="divider" />
          <div className="mono text-mute" style={{ fontSize: 9, padding: '0 4px' }}>filters</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: 4 }}>
            {['common', 'uncommon', 'rare', 'epic', 'legendary'].map(r => (
              <span key={r} className={`badge`} style={{ cursor: 'pointer' }}>{r}</span>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div>
          <div className="tabs">
            <div className="tab tab--active">featured</div>
            <div className="tab">new arrivals</div>
            <div className="tab">on sale</div>
            <div className="tab">limited</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {catalog[cat].map(it => (
              <div
                key={it.id}
                className={`item-card rarity-border--${it.r}`}
                onClick={() => setSelected(it.id)}
                style={{
                  outline: selected === it.id ? '3px solid var(--ember-1)' : 'none',
                  outlineOffset: 2,
                }}
              >
                <div className="item-card__art">{it.icon}</div>
                <div style={{ fontFamily: 'Pixelify Sans', fontSize: 12, marginTop: 6 }}>{it.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                  <span className={`rarity rarity--${it.r}`}>{it.r}</span>
                  {it.p > 0 ? (
                    <span className="coin"><span className="coin-icon" />{it.p}</span>
                  ) : (
                    <span className="mono text-ember">{it.p2}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="panel" style={{ alignSelf: 'start', position: 'sticky', top: 158 }}>
          <div className="mono text-mute" style={{ fontSize: 9 }}>preview</div>
          <h3>{selectedItem.name}</h3>
          <div className={`rarity rarity--${selectedItem.r}`} style={{ marginBottom: 10 }}>{selectedItem.r}</div>

          {/* mini scene preview */}
          <div style={{ border: '3px solid var(--ink-0)', overflow: 'hidden', marginBottom: 10 }}>
            <RoomScene variant={tweaks.roomLayout} height={140}>
              <div style={{ position: 'absolute', left: 14, bottom: 12 }}><Bookshelf scale={2} /></div>
              <div style={{ position: 'absolute', right: 14, bottom: 12 }}><Fireplace scale={2} /></div>
              <div style={{ position: 'absolute', left: '45%', bottom: 8 }}><Hero scale={3} pose={tweaks.heroPose} /></div>
              {selected === 'moonveil' && (
                <div style={{ position: 'absolute', left: '40%', bottom: 0, width: 80, height: 30, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(233,184,102,0.6), transparent 70%)' }} />
              )}
              {selected === 'raven' && <div style={{ position: 'absolute', left: '58%', bottom: 20 }}><RavenPet scale={2} /></div>}
              {selected === 'slime' && <div style={{ position: 'absolute', left: '58%', bottom: 10 }}><SlimePet scale={2} /></div>}
              {selected === 'orb' && <div style={{ position: 'absolute', left: '58%', bottom: 38 }}><SpiritOrb scale={2} /></div>}
              <Fireflies count={selected === 'fireflies' ? 14 : 3} />
            </RoomScene>
          </div>

          <div className="tabs" style={{ marginBottom: 10 }}>
            <div className="tab tab--active" style={{ padding: '6px 12px', fontSize: 11 }}>in chamber</div>
            <div className="tab" style={{ padding: '6px 12px', fontSize: 11 }}>on hero</div>
            <div className="tab" style={{ padding: '6px 12px', fontSize: 11 }}>in guild</div>
          </div>

          <div className="text-mute" style={{ fontSize: 12, marginBottom: 10 }}>
            Мерцающий ореол, который следует за героем в профиле и на странице арены. Активируется при победе в дуэли.
          </div>

          <div className="divider" />

          <div className="row items-center justify-between mb-3">
            <span className="mono text-mute">price</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <PixelCoin scale={2} />
              <span style={{ fontFamily: 'Pixelify Sans', fontSize: 22 }}>{selectedItem.p || '—'}</span>
            </div>
          </div>

          <button className="btn btn--primary" style={{ width: '100%' }}>purchase</button>
          <button className="btn btn--ghost btn--sm" style={{ width: '100%', marginTop: 8 }}>try on (1h)</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Arena
   ============================================================ */
function ArenaScreen({ user, onEnterDuel }) {
  return (
    <div>
      <PageHeader
        eyebrow="ARENA · coliseum"
        title="The Coliseum"
        subtitle="1v1 алгоритм-дуэли, командные бои, сезонная лестница. Каждый бой считается в рейтинге гильдии."
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn--sm">match history</button>
            <button className="btn btn--primary btn--sm" onClick={onEnterDuel}>find duel</button>
          </div>
        }
      />

      {/* Ladder + ready panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 18, marginBottom: 18 }}>
        <div className="panel panel--dark" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: '3px dashed rgba(246,234,208,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h3 style={{ color: 'var(--parch-0)' }}>Season ladder</h3>
              <span className="mono text-light" style={{ opacity: 0.7 }}>season III · 19 days left</span>
            </div>
          </div>
          <div style={{ padding: '14px 18px' }}>
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div className="mono text-light" style={{ opacity: 0.7 }}>your elo</div>
              <div style={{ fontFamily: 'Pixelify Sans', fontSize: 52, color: 'var(--ember-3)', lineHeight: 1 }}>1847</div>
              <div className="mono text-light" style={{ opacity: 0.7, marginTop: 4 }}>rank 412 · top 4%</div>
            </div>
            <div className="divider" style={{ borderColor: 'rgba(246,234,208,0.2)' }} />
            {[
              { n: 'kyrie.dev', elo: 2340, tier: 'mythic', you: false },
              { n: 'glowbeacon', elo: 2190, tier: 'grandmaster', you: false },
              { n: 'thornmoss', elo: 1847, tier: 'master', you: true },
              { n: 'lunarfox', elo: 1820, tier: 'master', you: false },
              { n: 'oakleaf', elo: 1710, tier: 'diamond', you: false },
            ].map((p, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 0',
                borderBottom: '1px dashed rgba(246,234,208,0.15)',
                color: 'var(--parch-0)',
                opacity: p.you ? 1 : 0.8,
                background: p.you ? 'rgba(233,184,102,0.08)' : 'transparent',
              }}>
                <span className="mono" style={{ width: 20, color: 'var(--ember-3)' }}>#{i + 1}</span>
                <span style={{ flex: 1, fontFamily: 'Pixelify Sans', fontSize: 13 }}>{p.n} {p.you && <span className="badge badge--ember" style={{ fontSize: 9 }}>you</span>}</span>
                <span className="mono" style={{ opacity: 0.7 }}>{p.tier}</span>
                <span className="mono" style={{ color: 'var(--ember-3)', width: 50, textAlign: 'right' }}>{p.elo}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Queue / opponent picker */}
        <div className="panel" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, transparent, rgba(59,42,26,0.08))',
            pointerEvents: 'none',
          }} />
          <h3>Choose your battle</h3>
          <div className="mono text-mute mb-3">3 режима · награды зависят от сложности</div>

          {[
            { t: '1v1 Ranked Duel', d: 'Algorithm duel · 20 min', reward: '+elo · +ember · +gold', hot: true, badge: 'queue 8s' },
            { t: 'Friendly Spar', d: 'Unranked · practice', reward: 'xp · small coin' },
            { t: 'Guild vs Guild', d: '3v3 · scheduled', reward: 'seasonal relic · guild xp', badge: 'sat 12:00' },
            { t: 'Blitz Arena', d: 'Easy · 5 min rounds', reward: 'fast xp · tokens' },
          ].map((m, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: 14,
              background: m.hot ? 'var(--parch-0)' : 'var(--parch-2)',
              border: '3px solid var(--ink-0)',
              marginBottom: 8,
              borderLeft: m.hot ? '6px solid var(--ember-1)' : '3px solid var(--ink-0)',
              paddingLeft: m.hot ? 8 : 14,
              position: 'relative',
            }}>
              <div style={{ width: 44, height: 44, background: 'var(--ink-0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sword scale={2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Pixelify Sans', fontSize: 15 }}>{m.t}</div>
                <div className="mono text-mute" style={{ fontSize: 10 }}>{m.d}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono text-ember" style={{ fontSize: 10 }}>{m.reward}</div>
                {m.badge && <span className="badge badge--ember" style={{ marginTop: 4, fontSize: 9 }}>{m.badge}</span>}
              </div>
              <button className={`btn ${m.hot ? 'btn--primary' : ''} btn--sm`} onClick={onEnterDuel}>enter</button>
            </div>
          ))}
        </div>
      </div>

      {/* Live matches + rivalry */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 18 }}>
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <h3>Recent duels</h3>
            <span className="mono text-mute">last 10</span>
          </div>
          {[
            { w: true, opp: 'nightcap', diff: 'medium · graphs', elo: '+24', time: '11:42' },
            { w: false, opp: 'glowbeacon', diff: 'hard · dp', elo: '-18', time: '10:02' },
            { w: true, opp: 'fernglade', diff: 'medium · strings', elo: '+21', time: '09:11' },
            { w: true, opp: 'petrogryph', diff: 'easy · arrays', elo: '+12', time: 'yesterday' },
            { w: false, opp: 'kyrie.dev', diff: 'hard · trees', elo: '-28', time: 'yesterday' },
          ].map((r, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '70px 1fr 120px 60px 80px',
              alignItems: 'center', gap: 10,
              padding: '10px 0', borderBottom: i < 4 ? '1px dashed var(--ink-3)' : 'none',
            }}>
              <span className={`badge ${r.w ? 'badge--moss' : ''}`} style={{ background: r.w ? 'var(--moss-1)' : 'var(--danger)', color: 'var(--parch-0)', borderColor: 'var(--ink-0)' }}>
                {r.w ? 'victory' : 'defeat'}
              </span>
              <div style={{ fontFamily: 'Pixelify Sans' }}>vs {r.opp}</div>
              <span className="mono text-mute">{r.diff}</span>
              <span className="mono" style={{ color: r.w ? 'var(--moss-1)' : 'var(--danger)' }}>{r.elo}</span>
              <span className="mono text-mute" style={{ textAlign: 'right' }}>{r.time}</span>
            </div>
          ))}
        </div>

        <div className="panel panel--wood">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <h3 style={{ color: 'var(--parch-0)' }}>Guild rivalry</h3>
            <span className="mono" style={{ color: 'var(--ember-3)' }}>live</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px 1fr', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ textAlign: 'center' }}>
              <Banner scale={2} color="#3d6149" crest="✦" />
              <div style={{ fontFamily: 'Pixelify Sans', fontSize: 14, color: 'var(--parch-0)' }}>Mossveil</div>
              <div style={{ fontFamily: 'Pixelify Sans', fontSize: 28, color: 'var(--ember-3)' }}>14</div>
            </div>
            <div style={{ fontFamily: 'Pixelify Sans', fontSize: 22, textAlign: 'center', color: 'var(--parch-0)' }}>vs</div>
            <div style={{ textAlign: 'center' }}>
              <Banner scale={2} color="#a23a2a" crest="◆" />
              <div style={{ fontFamily: 'Pixelify Sans', fontSize: 14, color: 'var(--parch-0)' }}>Red Ravens</div>
              <div style={{ fontFamily: 'Pixelify Sans', fontSize: 28, color: 'var(--ember-3)' }}>11</div>
            </div>
          </div>
          <div className="mono text-light mb-2" style={{ opacity: 0.7, fontSize: 10 }}>battle banner · victory grants</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className="badge badge--ember">seasonal relic</span>
            <span className="badge">hall banner skin</span>
            <span className="badge">+300 guild gold</span>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { GuildScreen, ShopScreen, ArenaScreen });
