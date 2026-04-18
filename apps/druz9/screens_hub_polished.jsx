/* ============================================================
   druz9 — Hub, polished (Sprint 3)
   Adds: Season Pass CTA banner, Live Duels widget, Friend Activity
   Keeps the visual vocabulary of screens_a.jsx
   ============================================================ */

function HubPolishedScreen({ user, tweaks, onNav }) {
  const [seasonXp] = React.useState(6820);
  const seasonMax = 12000;
  const seasonPct = Math.round((seasonXp / seasonMax) * 100);
  const seasonDaysLeft = 22;

  return (
    <div>
      <PageHeader
        eyebrow={`TOWN SQUARE · SEASON III · DAY ${90 - seasonDaysLeft} OF 90`}
        title={`Добро пожаловать, ${user.name}`}
        subtitle="Сегодня в городе оживлённо. Ember Pact подходит к концу — у тебя ещё 22 дня, чтобы забрать главную реликвию сезона."
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn--sm">daily rewards · 3</button>
            <button className="btn btn--primary btn--sm" onClick={() => onNav('training-task')}>continue task #6</button>
          </div>
        }
      />

      {/* ---- Season Pass ribbon ---- */}
      <div className="panel panel--wood" style={{ marginBottom: 18, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 280px', alignItems: 'stretch' }}>
          <div style={{ padding: '18px 22px', borderRight: '3px dashed rgba(246,234,208,0.35)' }}>
            <div className="row items-center gap-3 mb-2">
              <span className="badge badge--ember">SEASON PASS</span>
              <span className="mono" style={{ color: 'var(--parch-2)' }}>the ember pact · III</span>
              <span className="mono" style={{ color: 'var(--ember-3)' }}>● {seasonDaysLeft} days left</span>
            </div>
            <div style={{ fontFamily: 'Pixelify Sans', fontSize: 26, color: 'var(--parch-0)', lineHeight: 1.1, marginBottom: 8 }}>
              Сжать пламя — разжечь легенду
            </div>
            <div className="row items-center gap-3">
              <span className="mono" style={{ color: 'var(--parch-2)', fontSize: 10 }}>tier 34 / 60</span>
              <div className="bar grow" style={{ maxWidth: 340 }}>
                <div className="bar__fill" style={{ width: `${seasonPct}%` }} />
              </div>
              <span className="mono" style={{ color: 'var(--parch-0)' }}>{seasonXp.toLocaleString()}/{seasonMax.toLocaleString()}</span>
            </div>
          </div>

          {/* upcoming rewards */}
          <div style={{ padding: '16px 20px', borderRight: '3px dashed rgba(246,234,208,0.35)' }}>
            <div className="mono" style={{ color: 'var(--parch-2)', fontSize: 9, marginBottom: 8 }}>next 3 rewards</div>
            <div className="row gap-2">
              {[
                { t: 35, name: 'Ember Mantle', r: 'epic', sprite: <Hero scale={2} pose="trophy" /> },
                { t: 38, name: '+300 gems', r: 'rare', sprite: <div style={{ width: 20, height: 20, background: '#8fb8d4', border: '2px solid var(--ink-0)', transform: 'rotate(45deg)' }} /> },
                { t: 42, name: 'Raven Familiar', r: 'legendary', sprite: <RavenPet scale={2} /> },
              ].map((r, i) => (
                <div key={i} className={`rarity-border--${r.r}`} style={{
                  flex: 1, padding: 6,
                  background: 'var(--parch-0)', border: '3px solid var(--ink-0)',
                  opacity: i === 0 ? 1 : 0.7,
                  position: 'relative',
                }}>
                  <div style={{
                    height: 40, background: 'var(--parch-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                  }}>{r.sprite}</div>
                  <div className="mono" style={{ fontSize: 9, marginTop: 3 }}>T{r.t}</div>
                  <div style={{ fontFamily: 'Pixelify Sans', fontSize: 11, lineHeight: 1 }}>{r.name}</div>
                  <div className={`rarity rarity--${r.r}`} style={{ fontSize: 8 }}>{r.r}</div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
            <div className="mono" style={{ color: 'var(--parch-2)', fontSize: 9 }}>unlock premium track</div>
            <div style={{ fontFamily: 'Pixelify Sans', fontSize: 20, color: 'var(--parch-0)' }}>
              + 60 rewards, 4 cosmetics, 1 legendary
            </div>
            <button className="btn btn--primary pulse-ember" style={{ width: '100%' }}
              onClick={() => onNav('season')}>
              upgrade · 1,200 ✧
            </button>
            <button className="btn btn--ghost btn--sm" style={{ color: 'var(--parch-2)', borderColor: 'var(--parch-2)' }}>
              view all rewards
            </button>
          </div>
        </div>
      </div>

      {/* ---- Main 2-col: Live duels + Continue quest ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 18, marginBottom: 18 }}>
        {/* LIVE DUELS WIDGET */}
        <div className="panel panel--dark" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '12px 18px', borderBottom: '2px solid #0e0906',
            background: 'linear-gradient(90deg, #2a1816 0%, #2a2118 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div className="row items-center gap-2">
              <span className="live-dot" />
              <h3 style={{ color: 'var(--parch-0)', margin: 0 }}>Arena · Live now</h3>
              <span className="mono text-light" style={{ opacity: 0.6, marginLeft: 8 }}>12 duels · 4 at your elo</span>
            </div>
            <div className="row gap-2">
              <span className="tweak-chip tweak-chip--on">all</span>
              <span className="tweak-chip">your elo</span>
              <span className="tweak-chip">friends</span>
            </div>
          </div>
          <div style={{ padding: 14 }}>
            {[
              { a: 'thornmoss', b: 'kyrie.dev', ae: 1842, be: 1795, meta: 'medium · graphs', score: '02:14 left', hot: true, winA: 62 },
              { a: 'lunarfox', b: 'nightcap', ae: 1620, be: 1640, meta: 'hard · dp', score: '05:40 left', winA: 48 },
              { a: 'oakleaf', b: 'petrogryph', ae: 1310, be: 1298, meta: 'easy · arrays', score: '00:48 left', winA: 71 },
              { a: 'velvaine', b: 'stormcall', ae: 2104, be: 2088, meta: 'hard · systems', score: '12:20 left', winA: 52, featured: true },
            ].map((m, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '1fr auto 1fr auto',
                alignItems: 'center', gap: 12,
                padding: '10px 12px', marginBottom: 6,
                background: m.featured ? 'rgba(233,184,102,0.12)' : 'rgba(246,234,208,0.04)',
                border: `2px solid ${m.featured ? 'var(--ember-1)' : 'rgba(246,234,208,0.1)'}`,
              }}>
                {/* A */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Pixelify Sans', color: 'var(--parch-0)', fontSize: 13 }}>{m.a}</div>
                  <div className="mono text-light" style={{ fontSize: 9, opacity: 0.6 }}>{m.ae} elo</div>
                </div>
                {/* bar */}
                <div style={{ width: 120, height: 18, background: '#1a140e', border: '2px solid #0e0906', position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                    <div style={{ width: `${m.winA}%`, background: 'linear-gradient(90deg, var(--moss-1), var(--moss-2))' }} />
                    <div style={{ flex: 1, background: 'linear-gradient(90deg, var(--danger), #7a2a1a)' }} />
                  </div>
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Silkscreen', fontSize: 9, color: 'var(--parch-0)',
                    textShadow: '1px 1px 0 #0e0906',
                  }}>{m.winA}%</div>
                </div>
                {/* B */}
                <div>
                  <div style={{ fontFamily: 'Pixelify Sans', color: 'var(--parch-0)', fontSize: 13 }}>{m.b}</div>
                  <div className="mono text-light" style={{ fontSize: 9, opacity: 0.6 }}>{m.be} elo</div>
                </div>
                {/* meta */}
                <div style={{ textAlign: 'right' }}>
                  <div className="mono" style={{
                    color: m.hot ? 'var(--ember-3)' : 'var(--parch-2)', fontSize: 10,
                  }}>{m.score}</div>
                  <div className="mono text-light" style={{ fontSize: 9, opacity: 0.5 }}>{m.meta}</div>
                </div>
              </div>
            ))}
            <div className="row gap-2" style={{ marginTop: 10 }}>
              <button className="btn btn--primary" style={{ flex: 1 }} onClick={() => onNav('arena')}>
                quickmatch · find foe
              </button>
              <button className="btn" onClick={() => onNav('arena')}>spectate</button>
              <button className="btn" onClick={() => onNav('arena')}>ladder</button>
            </div>
          </div>
        </div>

        {/* CONTINUE QUEST + readiness */}
        <div className="panel panel--nailed" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ position: 'relative', height: 180, background: 'linear-gradient(180deg, #6b8a6a 0%, #3d6149 100%)', borderBottom: '4px solid var(--ink-0)' }}>
            <svg viewBox="0 0 400 120" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.4 }}>
              <polygon points="0,120 0,80 60,50 120,65 200,40 280,60 360,35 400,55 400,120" fill="#2d4a35" />
            </svg>
            <div style={{ position: 'absolute', left: 20, bottom: 6 }}><Hero scale={4} pose="trophy" /></div>
            <div style={{ position: 'absolute', left: 130, bottom: 10 }}><Torch scale={3} /></div>
            <div style={{ position: 'absolute', right: 20, bottom: 6 }}><Statue scale={3} color="#c7ab6e" /></div>
            <Fireflies count={5} />
            <div style={{ position: 'absolute', left: 12, top: 10 }}>
              <span className="badge badge--ember">main quest · ch. IV</span>
            </div>
            <div style={{ position: 'absolute', right: 12, top: 10 }}>
              <span className="badge badge--dark">42% complete</span>
            </div>
          </div>
          <div style={{ padding: 16 }}>
            <h3 style={{ whiteSpace: 'normal' }}>The Ember Pact — глава IV</h3>
            <div className="text-mute mb-2" style={{ fontSize: 12 }}>3 mock-интервью + 1 дуэль с Red Ravens откроют реликвию сезона.</div>
            <div className="row gap-3 mb-2" style={{ flexWrap: 'wrap' }}>
              {[
                ['mock interviews', '2/3', 67],
                ['duel red ravens', '0/1', 0],
                ['readiness', '78%', 78],
              ].map(([l, v, p], i) => (
                <div key={i} style={{ flex: 1, minWidth: 80 }}>
                  <div className="mono text-mute" style={{ fontSize: 9 }}>{l}</div>
                  <div style={{ fontFamily: 'Pixelify Sans', fontSize: 14 }}>{v}</div>
                  <div className="bar" style={{ height: 6 }}>
                    <div className={`bar__fill ${i === 0 ? 'bar__fill--moss' : ''}`} style={{ width: `${p}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="row gap-2" style={{ marginTop: 10 }}>
              <button className="btn btn--primary btn--sm" onClick={() => onNav('interview-live')}>next mock →</button>
              <button className="btn btn--sm" onClick={() => onNav('training')}>open map</button>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Friend activity + daily pacts + events ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18, marginBottom: 18 }}>
        {/* FRIEND ACTIVITY */}
        <div className="panel">
          <div className="row items-center justify-between mb-2">
            <h3>Friend activity</h3>
            <span className="mono text-mute">online 9 · in-arena 3</span>
          </div>
          <div className="mono text-mute mb-2" style={{ fontSize: 9 }}>last hour</div>
          {[
            { u: 'lunarfox', act: 'just won a duel vs. petrogryph', time: '2m', tag: 'arena', cta: 'rematch', color: 'var(--ember-1)' },
            { u: 'kyrie.dev', act: 'unlocked Graph Walker badge', time: '12m', tag: 'trophy', cta: 'cheer', color: 'var(--moss-1)' },
            { u: 'velvaine', act: 'started a mock interview', time: '18m', tag: 'mentor', cta: 'join', color: 'var(--r-epic)' },
            { u: 'oak', act: 'added a comment on your solution', time: '42m', tag: 'chat', cta: 'reply', color: 'var(--r-rare)' },
            { u: 'nightcap', act: 'invited you to a guild war', time: '1h', tag: 'guild', cta: 'view', color: 'var(--moss-1)' },
          ].map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', marginBottom: 6,
              background: 'var(--parch-0)',
              border: '2px solid var(--ink-0)',
              borderLeft: `6px solid ${f.color}`,
            }}>
              <div style={{
                width: 26, height: 26,
                background: f.color, border: '2px solid var(--ink-0)',
                fontFamily: 'Pixelify Sans', fontSize: 12, color: 'var(--parch-0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>{f.u[0].toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Pixelify Sans', fontSize: 12, lineHeight: 1.2 }}>
                  <span style={{ color: 'var(--ember-1)' }}>{f.u}</span>
                </div>
                <div className="text-mute" style={{ fontSize: 11, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.act}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <span className="mono text-mute" style={{ fontSize: 9 }}>{f.time}</span>
                <span className="tweak-chip" style={{ fontSize: 8, padding: '2px 6px' }}>{f.cta}</span>
              </div>
            </div>
          ))}
          <button className="btn btn--sm" style={{ width: '100%', marginTop: 6 }} onClick={() => onNav('social')}>
            open feed
          </button>
        </div>

        {/* DAILY PACTS */}
        <div className="panel">
          <div className="row items-center justify-between mb-2">
            <h3>Daily pacts</h3>
            <span className="mono text-mute">resets in 6h 12m</span>
          </div>
          {[
            { t: 'Реши 3 задачи medium', p: '2/3', done: false, active: true, reward: '+120 ✦ +40 gold' },
            { t: 'Попробуй mock-интервью', p: '1/1', done: true, reward: '+80 ✦' },
            { t: 'Прослушай 1 подкаст', p: '0/1', done: false, reward: '+50 ✦ +1 scroll' },
            { t: 'Победи в дуэли', p: '0/1', done: false, reward: '+100 ✦ +1 ember' },
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
          <div className="divider" />
          <div className="row items-center justify-between">
            <span className="mono text-mute" style={{ fontSize: 10 }}>3/4 → chest</span>
            <button className="btn btn--sm">view week</button>
          </div>
        </div>

        {/* TONIGHT */}
        <div className="panel panel--recessed">
          <div className="row items-center justify-between mb-2">
            <h3>Tonight · town board</h3>
            <span className="mono text-mute">next 48h</span>
          </div>
          {[
            { date: 'tonight · 20:00', t: 'Midnight Contest', meta: 'solo · 2h · ember reward', hot: true, rsvp: 18 },
            { date: 'fri · 18:00', t: 'Book club: Designing Data', meta: 'community · tavern', rsvp: 42 },
            { date: 'sat · 12:00', t: 'Guild war: Red Ravens', meta: 'guild · bracketed', hot: true, rsvp: 24 },
            { date: 'sun · all day', t: 'Harvest festival', meta: 'seasonal · cosmetics', rsvp: 220 },
          ].map((e, i) => (
            <div key={i} style={{
              padding: '8px 10px', background: 'var(--parch-0)',
              border: '2px solid var(--ink-0)', marginBottom: 6,
              borderLeft: e.hot ? '6px solid var(--ember-1)' : '2px solid var(--ink-0)',
              paddingLeft: e.hot ? 6 : 10,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div className="mono text-mute" style={{ fontSize: 9 }}>{e.date}</div>
                <div style={{ fontFamily: 'Pixelify Sans', fontSize: 13, lineHeight: 1.1 }}>{e.t}</div>
                <div className="mono text-mute" style={{ fontSize: 9 }}>{e.meta}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono text-mute" style={{ fontSize: 9 }}>★ {e.rsvp}</div>
                <span className="tweak-chip" style={{ fontSize: 8, marginTop: 2 }}>rsvp</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Third row: guild siege + merchant picks (abbreviated) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div className="panel">
          <div className="row items-center justify-between mb-2">
            <h3>Guild siege · Mossveil vs. Red Ravens</h3>
            <span className="badge badge--moss">leading</span>
          </div>
          <div className="row items-baseline gap-3 mb-2">
            <div style={{ fontFamily: 'Pixelify Sans', fontSize: 28, color: 'var(--moss-1)' }}>2,150</div>
            <span className="mono text-mute">vs.</span>
            <div style={{ fontFamily: 'Pixelify Sans', fontSize: 28, color: 'var(--danger)' }}>1,920</div>
            <div style={{ flex: 1 }} />
            <span className="mono">30h left</span>
          </div>
          <div className="bar mb-2"><div className="bar__fill bar__fill--moss" style={{ width: '53%' }} /></div>
          <div className="mono text-mute mb-3" style={{ fontSize: 10 }}>contribute tasks, duels, podcasts — all count</div>
          <div className="row gap-2">
            <button className="btn btn--moss btn--sm" style={{ flex: 1 }} onClick={() => onNav('guild')}>enter guild</button>
            <button className="btn btn--sm" onClick={() => onNav('arena')}>duel a raven</button>
          </div>
        </div>

        <div className="panel panel--wood">
          <div className="row items-center justify-between mb-2">
            <h3 style={{ color: 'var(--parch-0)' }}>Merchant's pick</h3>
            <span className="mono" style={{ color: 'var(--parch-2)' }}>18h rotation</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { name: 'Moonveil Aura', rarity: 'epic', price: 480, icon: <SpiritOrb scale={2} /> },
              { name: 'Raven Familiar', rarity: 'rare', price: 260, icon: <RavenPet scale={2} /> },
              { name: 'Ember Cloak', rarity: 'legendary', price: 920, icon: <Hero scale={2} /> },
              { name: 'Dusk Lantern', rarity: 'uncommon', price: 140, icon: <Torch scale={2} /> },
            ].map((it, i) => (
              <div key={i} className={`item-card rarity-border--${it.rarity}`} style={{ background: 'var(--parch-0)' }}>
                <div className="item-card__art" style={{ overflow: 'hidden' }}>{it.icon}</div>
                <div style={{ fontFamily: 'Pixelify Sans', fontSize: 11, marginTop: 4 }}>{it.name}</div>
                <div className="row items-center justify-between" style={{ marginTop: 2 }}>
                  <span className={`rarity rarity--${it.rarity}`} style={{ fontSize: 8 }}>{it.rarity}</span>
                  <span className="mono" style={{ fontSize: 9 }}>● {it.price}</span>
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn--sm" style={{ width: '100%', marginTop: 10 }} onClick={() => onNav('shop')}>
            visit merchant
          </button>
        </div>
      </div>

      <SoundAnnotation notes={[
        { at: 'hub enter', sfx: 'town-ambient.wav', desc: 'Low market murmur + distant forge, looped, −24 LUFS.' },
        { at: 'live-duel tick', sfx: 'sword-click.wav', desc: 'Tiny metal tick every 8s while widget is visible; never stacks.' },
        { at: 'season CTA hover', sfx: 'ember-crackle.wav', desc: 'Short warm crackle, 200ms, only on pointer enter.' },
        { at: 'friend activity ping', sfx: 'bell-small.wav', desc: 'Single muted bell when new item appears; never on scroll.' },
      ]} />
    </div>
  );
}

Object.assign(window, { HubPolishedScreen });
