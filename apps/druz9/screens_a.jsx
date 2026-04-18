/* ============================================================
   druz9 — Hub (Town Square) + Profile (Hero Chamber)
   ============================================================ */

function HubScreen({ user, tweaks, onNav }) {
  return (
    <div>
      <PageHeader
        eyebrow="TOWN SQUARE · central hub"
        title="Добро пожаловать, путник"
        subtitle="Сегодня в городе оживленно — арена гудит, на площади объявили новый ивент, и твоя гильдия начала ночную вылазку."
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn--sm">daily rewards</button>
            <button className="btn btn--primary btn--sm">continue quest</button>
          </div>
        }
      />

      {/* Top row: big quest + arena glance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, marginBottom: 18 }}>
        <div className="panel panel--nailed" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ position: 'relative', height: 220, background: 'linear-gradient(180deg, #6b8a6a 0%, #3d6149 100%)', borderBottom: '4px solid var(--ink-0)' }}>
            {/* scene */}
            <svg viewBox="0 0 400 120" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.4 }}>
              <polygon points="0,120 0,80 60,50 120,65 200,40 280,60 360,35 400,55 400,120" fill="#2d4a35" />
            </svg>
            <div className="rain" />
            <div style={{ position: 'absolute', left: 20, bottom: 6 }}><Hero scale={4} pose="trophy" /></div>
            <div style={{ position: 'absolute', left: 150, bottom: 10 }}><Torch scale={3} /></div>
            <div style={{ position: 'absolute', right: 30, bottom: 6 }}><Statue scale={3} color="#c7ab6e" /></div>
            <Fireflies count={6} />
            <div style={{ position: 'absolute', left: 16, top: 14 }}>
              <span className="badge badge--ember">main quest · chapter IV</span>
            </div>
          </div>
          <div style={{ padding: 20 }}>
            <h2>The Ember Pact — глава IV</h2>
            <div className="text-mute mb-3">Пройди 3 mock-интервью в Башне Ментора и победи в дуэли соперника из Red Ravens, чтобы разблокировать реликвию сезона.</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div className="bar grow"><div className="bar__fill" style={{ width: '42%' }} /></div>
              <span className="mono">42%</span>
              <button className="btn btn--primary btn--sm" onClick={() => onNav('training')}>resume</button>
            </div>
          </div>
        </div>

        {/* arena glance */}
        <div className="panel panel--dark">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <h3 style={{ color: 'var(--parch-0)' }}>Arena · live</h3>
            <span className="mono text-light" style={{ opacity: 0.7 }}>3 duels ongoing</span>
          </div>
          {[
            { a: 'thornmoss', b: 'kyrie.dev', meta: 'medium · graphs', score: '02:14', hot: true },
            { a: 'lunarfox', b: 'nightcap', meta: 'hard · dp', score: '05:40' },
            { a: 'oakleaf', b: 'petrogryph', meta: 'easy · arrays', score: '00:48' },
          ].map((m, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px',
              marginBottom: 6,
              background: 'rgba(246,234,208,0.06)',
              border: '2px solid rgba(246,234,208,0.15)',
            }}>
              <span className="mono" style={{ color: 'var(--parch-0)', width: 80 }}>{m.a}</span>
              <span className="mono" style={{ color: 'var(--ember-3)' }}>⚔</span>
              <span className="mono" style={{ color: 'var(--parch-0)', width: 80 }}>{m.b}</span>
              <span className="mono" style={{ color: 'var(--parch-2)', flex: 1, textAlign: 'right', fontSize: 9 }}>{m.meta}</span>
              <span className="mono" style={{ color: m.hot ? 'var(--ember-3)' : 'var(--parch-0)' }}>{m.score}</span>
            </div>
          ))}
          <button className="btn btn--primary" style={{ width: '100%', marginTop: 10 }} onClick={() => onNav('arena')}>
            enter arena
          </button>
        </div>
      </div>

      {/* Second row: quests + guild + events */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18, marginBottom: 18 }}>
        {/* Daily quests */}
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <h3>Daily Pacts</h3>
            <span className="mono text-mute">resets in 6h 12m</span>
          </div>
          {[
            { t: 'Реши 3 задачи medium', p: '2/3', done: false, active: true, reward: '+120 ✦ +40 gold' },
            { t: 'Попробуй mock-интервью', p: '1/1', done: true, reward: '+80 ✦' },
            { t: 'Прослушай 1 эпизод подкаста', p: '0/1', done: false, reward: '+50 ✦ +1 scroll' },
            { t: 'Победи в 1 дуэли', p: '0/1', done: false, reward: '+100 ✦ +1 ember' },
          ].map((q, i) => (
            <div key={i} className={`quest ${q.done ? 'quest--done' : ''} ${q.active ? 'quest--active' : ''}`}>
              <div className="quest__check" />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Pixelify Sans', fontSize: 13 }}>{q.t}</div>
                <div className="mono text-mute" style={{ fontSize: 9 }}>{q.reward}</div>
              </div>
              <span className="mono">{q.p}</span>
            </div>
          ))}
        </div>

        {/* Guild state */}
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <h3>Guild · Mossveil</h3>
            <span className="badge badge--moss">rank 14</span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Banner scale={3} color="#3d6149" crest="✦" />
            <div style={{ flex: 1 }}>
              <div className="mono text-mute" style={{ fontSize: 9 }}>weekly campaign</div>
              <div style={{ fontFamily: 'Pixelify Sans', fontSize: 14, marginBottom: 4 }}>Siege of the Red Ravens</div>
              <div className="bar" style={{ marginBottom: 4 }}><div className="bar__fill bar__fill--moss" style={{ width: '72%' }} /></div>
              <div className="mono text-mute" style={{ fontSize: 9 }}>2150 / 3000 points · 38h left</div>
            </div>
          </div>
          <div className="divider" />
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {['thornmoss', 'lunarfox', 'kyrie', 'oak', 'velva', '+12'].map((n, i) => (
              <div key={i} style={{
                padding: '3px 7px',
                border: '2px solid var(--ink-0)',
                background: i === 5 ? 'var(--parch-2)' : 'var(--parch-0)',
                fontFamily: 'Silkscreen', fontSize: 9,
              }}>{n}</div>
            ))}
          </div>
          <button className="btn btn--moss" style={{ width: '100%', marginTop: 12 }} onClick={() => onNav('guild')}>
            enter guild hall
          </button>
        </div>

        {/* Events */}
        <div className="panel panel--recessed">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <h3>Upcoming</h3>
            <span className="mono text-mute">town board</span>
          </div>
          {[
            { date: 'tonight · 20:00', t: 'Midnight Contest', meta: 'solo · 2h · ember reward', hot: true },
            { date: 'fri · 18:00', t: 'Book club: "Designing Data"', meta: 'community · tavern' },
            { date: 'sat · 12:00', t: 'Guild war: Red Ravens', meta: 'guild · bracketed' },
            { date: 'sun · all day', t: 'Harvest festival', meta: 'seasonal · cosmetics' },
          ].map((e, i) => (
            <div key={i} style={{
              padding: '10px 10px',
              background: 'var(--parch-0)',
              border: '2px solid var(--ink-0)',
              marginBottom: 8,
              position: 'relative',
              borderLeft: e.hot ? '6px solid var(--ember-1)' : '2px solid var(--ink-0)',
              paddingLeft: e.hot ? 6 : 10,
            }}>
              <div className="mono text-mute" style={{ fontSize: 9, marginBottom: 2 }}>{e.date}</div>
              <div style={{ fontFamily: 'Pixelify Sans', fontSize: 13 }}>{e.t}</div>
              <div className="mono text-mute" style={{ fontSize: 9 }}>{e.meta}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Third row: progression map + featured rewards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <h3>Your Journey</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              <span className="badge">algorithms 62%</span>
              <span className="badge">system-design 34%</span>
              <span className="badge">frontend 71%</span>
            </div>
          </div>
          <svg viewBox="0 0 520 140" style={{ width: '100%', height: 140 }}>
            {/* path */}
            <path d="M 20 110 Q 80 40, 160 80 T 320 60 T 500 30" fill="none" stroke="#5a3f27" strokeWidth="3" strokeDasharray="6 4" />
            {[
              { x: 20, y: 110, label: 'start', on: true },
              { x: 120, y: 72, label: 'arrays', on: true },
              { x: 220, y: 88, label: 'trees', on: true },
              { x: 320, y: 60, label: 'graphs', on: true, cur: true },
              { x: 420, y: 48, label: 'dp', on: false },
              { x: 500, y: 30, label: 'systems', on: false, gated: true },
            ].map((n, i) => (
              <g key={i}>
                <rect x={n.x - 10} y={n.y - 10} width="20" height="20"
                  fill={n.cur ? '#b8692a' : n.on ? '#3d6149' : '#c7ab6e'}
                  stroke="#3b2a1a" strokeWidth="3" />
                <text x={n.x} y={n.y + 30} textAnchor="middle" fontFamily="Silkscreen" fontSize="10" fill="#3b2a1a">{n.label}</text>
              </g>
            ))}
          </svg>
          <div className="divider" />
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn--sm" onClick={() => onNav('training')}>open roadmap</button>
            <button className="btn btn--ghost btn--sm" onClick={() => onNav('interview')}>book mentor</button>
            <div style={{ flex: 1 }} />
            <span className="mono text-mute">next milestone: Graph Master · in 3 tasks</span>
          </div>
        </div>

        <div className="panel panel--wood">
          <h3 style={{ color: 'var(--parch-0)' }}>Merchant's pick</h3>
          <div className="mono" style={{ color: 'var(--parch-2)', marginBottom: 10 }}>rotates in 18h</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { name: 'Moonveil Aura', rarity: 'epic', price: 480, icon: <SpiritOrb scale={3} /> },
              { name: 'Raven Familiar', rarity: 'rare', price: 260, icon: <RavenPet scale={3} /> },
              { name: 'Emberward Cloak', rarity: 'legendary', price: 920, icon: <Hero scale={2} /> },
              { name: 'Lantern of Dusk', rarity: 'uncommon', price: 140, icon: <Torch scale={2} /> },
            ].map((it, i) => (
              <div key={i} className={`item-card rarity-border--${it.rarity}`} style={{ background: 'var(--parch-0)' }}>
                <div className="item-card__art" style={{ overflow: 'hidden' }}>{it.icon}</div>
                <div style={{ fontFamily: 'Pixelify Sans', fontSize: 12, marginTop: 6 }}>{it.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                  <span className={`rarity rarity--${it.rarity}`}>{it.rarity}</span>
                  <span className="coin"><span className="coin-icon" />{it.price}</span>
                </div>
              </div>
            ))}
          </div>
          <button className="btn" style={{ width: '100%', marginTop: 12 }} onClick={() => onNav('shop')}>
            visit merchant
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Profile / Hero Chamber
   ============================================================ */
function ProfileScreen({ user, tweaks, visitorMode, onToggleVisitor }) {
  const layout = tweaks.roomLayout;
  const [editRoom, setEditRoom] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState(null);

  return (
    <div>
      <PageHeader
        eyebrow={visitorMode ? "VISITOR VIEW · Thornmoss's chamber" : "HERO CHAMBER · your sanctum"}
        title={visitorMode ? "Thornmoss · mossveil ⚑" : "Thornmoss"}
        subtitle={visitorMode ? "Вы смотрите на чужой профиль. Доступны жесты: подарить, вызвать на дуэль, подписаться." : "Личная комната. Каждый трофей, аура и предмет — это то, что ты заработал в мире druz9."}
        right={
          visitorMode ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn--sm" onClick={onToggleVisitor}>exit visitor view</button>
              <button className="btn btn--sm">send gift</button>
              <button className="btn btn--sm">follow</button>
              <button className="btn btn--primary btn--sm">challenge to duel</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn--sm" onClick={onToggleVisitor}>view as visitor</button>
              <button className={`btn btn--sm ${editRoom ? 'btn--primary' : ''}`} onClick={() => setEditRoom(e => !e)}>{editRoom ? 'done editing' : 'customize'}</button>
            </div>
          )
        }
      />

      {/* Chamber scene */}
      <div className="panel panel--nailed" style={{ padding: 0, overflow: 'hidden', marginBottom: 18 }}>
        <RoomScene variant={layout} height={320}>
          {/* left cluster */}
          <div style={{ position: 'absolute', left: 24, top: 30 }}><Window scale={3} /></div>
          <div style={{ position: 'absolute', left: 24, bottom: 14 }}><Bookshelf scale={3} /></div>
          <div style={{ position: 'absolute', left: 150, bottom: 30 }}><Torch scale={3} /></div>

          {/* banner + crest */}
          <div style={{ position: 'absolute', left: '36%', top: 14 }}><Banner scale={3} color="#3d6149" crest="✦" /></div>

          {/* hero center stage */}
          <div style={{ position: 'absolute', left: '44%', bottom: 10 }}>
            <Hero scale={5} pose={tweaks.heroPose} />
            {/* aura under hero */}
            <div style={{
              position: 'absolute', left: -20, bottom: -8,
              width: 120, height: 30,
              borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(233,184,102,0.35) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
          </div>

          {/* pet */}
          {tweaks.pet === 'slime' && <div style={{ position: 'absolute', left: '54%', bottom: 12 }}><SlimePet scale={3} /></div>}
          {tweaks.pet === 'raven' && <div style={{ position: 'absolute', left: '54%', bottom: 20 }}><RavenPet scale={3} /></div>}
          {tweaks.pet === 'orb' && <div style={{ position: 'absolute', left: '54%', bottom: 60 }}><SpiritOrb scale={3} /></div>}

          {/* right cluster */}
          <div style={{ position: 'absolute', right: 180, bottom: 14 }}><Fireplace scale={3} /></div>
          <div style={{ position: 'absolute', right: 40, bottom: 14, display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            <Chest scale={3} />
            <Statue scale={3} color="#9fb89a" />
          </div>

          {/* rug on floor */}
          <div style={{ position: 'absolute', left: '42%', bottom: 0 }}><Rug scale={3} w={24} /></div>

          {/* fireflies */}
          <Fireflies count={10} />

          {/* overlay label */}
          <div style={{ position: 'absolute', left: 16, bottom: 12 }}>
            <span className="badge badge--dark">chamber · forest dusk layout</span>
          </div>
          <div style={{ position: 'absolute', right: 16, top: 16, display: 'flex', gap: 6 }}>
            {editRoom ? (
              <>
                <button className="btn btn--sm">save layout</button>
                <button className="btn btn--sm">reset</button>
              </>
            ) : !visitorMode && (
              <>
                <button className="btn btn--sm" onClick={() => setEditRoom(true)}>edit layout</button>
                <button className="btn btn--sm">change theme</button>
              </>
            )}
          </div>

          {editRoom && (
            <>
              {/* grid overlay */}
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 40px, rgba(233,184,102,0.2) 40px 41px), repeating-linear-gradient(0deg, transparent 0 40px, rgba(233,184,102,0.2) 40px 41px)', pointerEvents: 'none' }} />
              {/* grabber handles on items */}
              {['24px, 30px', 'calc(54% - 20px), 20px', '44%, calc(100% - 80px)', 'calc(100% - 220px), 14px'].map((pos, i) => (
                <div key={i} style={{ position: 'absolute', left: pos.split(',')[0], top: pos.split(',')[1], width: 24, height: 24, border: '2px dashed var(--ember-3)', background: 'rgba(233,184,102,0.15)', cursor: 'move' }} />
              ))}
            </>
          )}
        </RoomScene>
      </div>

      {/* Edit catalog (only in edit mode) */}
      {editRoom && (
        <div className="panel panel--wood" style={{ marginBottom: 18, padding: 16 }}>
          <div className="row items-center justify-between mb-3">
            <h3 style={{ color: 'var(--parch-0)' }}>Inventory · drag to place</h3>
            <div className="row gap-2">
              <span className="mono" style={{ color: 'var(--parch-2)', fontSize: 10 }}>24 items owned</span>
              <button className="btn btn--sm">browse shop</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8 }}>
            {[
              { n: 'Banner · Moss', c: '#3d6149', r: 'rare' },
              { n: 'Bookshelf', c: '#7a593a', r: 'common' },
              { n: 'Torch', c: '#b8692a', r: 'common' },
              { n: 'Fireplace', c: '#a23a2a', r: 'uncommon' },
              { n: 'Stone Statue', c: '#9fb89a', r: 'epic' },
              { n: 'Ember Rug', c: '#b8692a', r: 'rare' },
              { n: 'Chest · Gold', c: '#dcc690', r: 'rare' },
              { n: 'Window · Dusk', c: '#3b6a8f', r: 'uncommon' },
              { n: 'Raven Perch', c: '#3b2a1e', r: 'legendary' },
              { n: 'Spirit Orb', c: '#8fb8d4', r: 'epic' },
              { n: 'Crystal Lamp', c: '#a27ac8', r: 'legendary' },
              { n: 'Moss Carpet', c: '#6b8a6a', r: 'common' },
              { n: 'Weapon Rack', c: '#5a3f27', r: 'uncommon' },
              { n: 'Trophy Shelf', c: '#e9b866', r: 'epic' },
              { n: '+ get more', c: 'var(--parch-3)', r: 'locked' },
              { n: '+ get more', c: 'var(--parch-3)', r: 'locked' },
            ].map((it, i) => (
              <div key={i} className={`rarity-border--${it.r}`} style={{
                padding: 6, border: '3px solid var(--ink-0)',
                background: 'var(--parch-0)', cursor: it.r === 'locked' ? 'default' : 'grab',
                opacity: it.r === 'locked' ? 0.5 : 1,
              }}>
                <div style={{ height: 40, background: it.c, border: '2px solid var(--ink-0)', marginBottom: 4 }} />
                <div style={{ fontFamily: 'Pixelify Sans', fontSize: 10, lineHeight: 1.1 }}>{it.n}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profile grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
        {/* Stats */}
        <div className="panel">
          <h3>Stats</h3>
          <div className="mono text-mute mb-3">all-time</div>
          {[
            { k: 'time in-world', v: '214h 30m' },
            { k: 'tasks solved', v: '1,248' },
            { k: 'duels won', v: '86 / 54' },
            { k: 'mock interviews', v: '42' },
            { k: 'podcasts heard', v: '73' },
            { k: 'trophies', v: '38' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 5 ? '1px dashed var(--ink-3)' : 'none' }}>
              <span className="text-mute">{s.k}</span>
              <span style={{ fontFamily: 'Pixelify Sans' }}>{s.v}</span>
            </div>
          ))}
          <div className="divider" />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="badge badge--ember">streak 42d</span>
            <span className="mono text-mute">longest 87d</span>
          </div>
        </div>

        {/* Achievements */}
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <h3>Pinned achievements</h3>
            <span className="mono text-mute">128/240</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { t: 'First Blood', d: 'won your first duel', rare: 'common' },
              { t: 'Night Owl', d: '10 tasks past midnight', rare: 'uncommon' },
              { t: 'Raven Whisperer', d: 'tamed a raven familiar', rare: 'rare' },
              { t: 'Ember Bearer', d: 'completed season II', rare: 'epic' },
              { t: 'Siegebreaker', d: 'won a guild war', rare: 'epic' },
              { t: 'Archmage', d: 'solved 100 hard tasks', rare: 'legendary' },
            ].map((a, i) => (
              <div key={i} className={`rarity-border--${a.rare}`} style={{
                padding: 8,
                border: `3px solid`, borderColor: 'var(--ink-0)',
                background: 'var(--parch-0)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Trophy scale={2} tier={a.rare === 'legendary' ? 'gold' : a.rare === 'epic' ? 'silver' : 'bronze'} />
                  <div>
                    <div style={{ fontFamily: 'Pixelify Sans', fontSize: 12 }}>{a.t}</div>
                    <div className={`rarity rarity--${a.rare}`}>{a.rare}</div>
                  </div>
                </div>
                <div className="mono text-mute" style={{ fontSize: 9, marginTop: 4 }}>{a.d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <h3>Recent journey</h3>
            <span className="mono text-mute">last 7 days</span>
          </div>
          {[
            { t: 'today 11:42', e: 'Won duel vs nightcap', meta: '+42 elo · +1 ember', tag: 'arena' },
            { t: 'today 09:10', e: 'Completed graph module lvl 6', meta: '+320 ✦ · +40 gold', tag: 'training' },
            { t: 'yesterday', e: 'Mock interview · readiness 78%', meta: 'system design', tag: 'mentor' },
            { t: '2 days ago', e: 'Equipped Moonveil Aura', meta: 'shop purchase', tag: 'shop' },
            { t: '3 days ago', e: 'Guild reached rank 14', meta: 'mossveil', tag: 'guild' },
            { t: '4 days ago', e: 'Unlocked: Raven Whisperer', meta: 'rare achievement', tag: 'trophy' },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < 5 ? '1px dashed var(--ink-3)' : 'none' }}>
              <div style={{ width: 6, background: 'var(--ember-1)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Pixelify Sans', fontSize: 12 }}>{r.e}</div>
                <div className="mono text-mute" style={{ fontSize: 9 }}>{r.t} · {r.meta}</div>
              </div>
              <span className="badge" style={{ fontSize: 9, height: 18 }}>{r.tag}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Inventory strip */}
      <div className="panel panel--recessed" style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <h3>Equipped cosmetics</h3>
          <span className="mono text-mute">aura · cloak · title · frame · companion · ambient</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
          {[
            { t: 'Moonveil Aura', r: 'epic', icon: <SpiritOrb scale={2} /> },
            { t: 'Emberward Cloak', r: 'legendary', icon: <Hero scale={2} /> },
            { t: '"Siegebreaker"', r: 'rare', icon: <Sword scale={2} /> },
            { t: 'Oakleaf Frame', r: 'uncommon', icon: <Banner scale={2} color="#3d6149" crest="◆" /> },
            { t: 'Raven', r: 'rare', icon: <RavenPet scale={2} /> },
            { t: 'Fireflies', r: 'common', icon: <div style={{ width: 20, height: 20, background: 'var(--ember-3)', borderRadius: '50%' }} /> },
          ].map((c, i) => (
            <div key={i} className={`item-card rarity-border--${c.r}`}>
              <div className="item-card__art">{c.icon}</div>
              <div style={{ fontFamily: 'Pixelify Sans', fontSize: 11, marginTop: 4 }}>{c.t}</div>
              <div className={`rarity rarity--${c.r}`}>{c.r}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HubScreen, ProfileScreen });
