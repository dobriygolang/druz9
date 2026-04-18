/* ============================================================
   druz9 — Sprint 3 part A: Events, Podcasts, Guild War
   ============================================================ */

/* ---------- Events / Town Board ---------- */
function EventsScreen() {
  const [cat, setCat] = React.useState('all');
  const events = [
    { id: 'harvest', t: 'Harvest Festival', type: 'seasonal', d: 'Oct 12 – Oct 26', meta: '2 weeks · community', hero: '#b8692a', desc: 'Соберите 500 яблок задач по всей платформе. Общий прогресс + личные награды.', rewards: ['gold pack ×2', 'autumn frame', '+500 xp'], hot: true, progress: 0.42 },
    { id: 'tourney', t: 'Autumn Grand Tourney', type: 'tournament', d: 'Oct 19', meta: '128 slots · single-elim', hero: '#a23a2a', desc: 'Одиночный турнир алгоритмов с призовым фондом. 3 раунда, лучшие 16 → грандфинал.', rewards: ['5000 gold', 'legendary frame', 'trophy'], progress: 0 },
    { id: 'nightfall', t: "Nightfall Raid", type: 'guild', d: 'tonight 21:00', meta: 'guild · 4v4', hero: '#3b2a1e', desc: 'Ночной рейд гильдии на неизведанную задачу. Нужен стек алгоритмов и графов.', rewards: ['200 gp each', 'raid banner'], progress: 0.1 },
    { id: 'lecture', t: 'Archmage Lecture: Systems', type: 'lecture', d: 'Oct 18 · 19:00', meta: 'stream · 90 min', hero: '#3d6149', desc: 'Открытый стрим по system design от приглашённого мастера.', rewards: ['+80 xp', 'systems badge'], progress: 0 },
    { id: 'weekly', t: 'Weekly Challenge', type: 'weekly', d: 'every Mon', meta: 'personal · 5 tasks', hero: '#dcc690', desc: '5 задач недели. Награда растёт с каждой выполненной.', rewards: ['+120 xp/task', 'streak protect'], progress: 0.6 },
    { id: 'dungeon', t: 'The Catacombs of K', type: 'raid', d: 'permanent', meta: 'endless · solo/guild', hero: '#4a2a5a', desc: 'Подземелье с нарастающей сложностью. Глубже = лучше трофеи.', rewards: ['dungeon gold', 'relic drops'], progress: 0.15 },
  ];
  const cats = [['all', 'All'], ['seasonal', 'Seasonal'], ['tournament', 'Tournaments'], ['guild', 'Guild'], ['weekly', 'Weekly'], ['lecture', 'Lectures'], ['raid', 'Raids']];
  const filtered = cat === 'all' ? events : events.filter(e => e.type === cat);

  return (
    <div>
      <PageHeader
        eyebrow="TOWN BOARD · quests & gatherings"
        title="Public Notices"
        subtitle="Сезонные кампании, турниры, гильд-рейды и еженедельные челленджи. Пинай доску — находи приключения."
        right={<span className="mono text-mute">12 active · 3 ending soon</span>}
      />

      {/* calendar strip */}
      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="row items-center justify-between mb-3">
          <h3>October · season III</h3>
          <div className="row gap-2">
            <button className="btn btn--sm">← prev</button>
            <button className="btn btn--sm">next →</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className="mono text-mute" style={{ fontSize: 9, textAlign: 'center', padding: 4 }}>{d}</div>
          ))}
          {Array.from({ length: 31 }).map((_, i) => {
            const day = i + 1;
            const evts = [];
            if (day >= 12 && day <= 26) evts.push({ c: 'var(--ember-1)' });
            if (day === 19) evts.push({ c: 'var(--danger)' });
            if (day === 18) evts.push({ c: 'var(--moss-1)' });
            if (day % 7 === 1) evts.push({ c: 'var(--parch-3)' });
            const today = day === 15;
            return (
              <div key={day} style={{
                aspectRatio: '1.3',
                border: '2px solid var(--ink-0)',
                background: today ? 'var(--ember-1)' : 'var(--parch-0)',
                color: today ? 'var(--parch-0)' : 'var(--ink-0)',
                padding: 4,
                display: 'flex', flexDirection: 'column', gap: 2,
                position: 'relative',
              }}>
                <span className="mono" style={{ fontSize: 9 }}>{day}</span>
                <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {evts.map((e, j) => <div key={j} style={{ width: 6, height: 6, background: e.c, border: '1px solid var(--ink-0)' }} />)}
                </div>
                {today && <div className="mono" style={{ fontSize: 8, position: 'absolute', bottom: 2, right: 4 }}>today</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="tabs">
        {cats.map(([id, t]) => (
          <div key={id} className={`tab ${cat === id ? 'tab--active' : ''}`} onClick={() => setCat(id)}>{t}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {filtered.map(e => (
          <div key={e.id} className="panel panel--nailed" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
            {e.hot && <span className="badge badge--ember" style={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}>live now</span>}
            <div style={{
              height: 120, background: `linear-gradient(180deg, ${e.hero} 0%, #1a140e 100%)`,
              position: 'relative', display: 'flex', alignItems: 'flex-end', padding: 14, borderBottom: '3px solid var(--ink-0)',
            }}>
              {e.type === 'tournament' && <div style={{ position: 'absolute', right: 20, top: 14 }}><Trophy scale={3} tier="gold" /></div>}
              {e.type === 'seasonal' && <div style={{ position: 'absolute', right: 20, top: 14 }}><Sword scale={3} /></div>}
              {e.type === 'guild' && <div style={{ position: 'absolute', right: 20, top: 14 }}><Banner scale={3} color="var(--moss-1)" /></div>}
              {e.type === 'lecture' && <div style={{ position: 'absolute', right: 20, top: 14 }}><Statue scale={3} color="#dcc690" /></div>}
              {e.type === 'raid' && <div style={{ position: 'absolute', right: 20, top: 14 }}><Chest scale={3} /></div>}
              {e.type === 'weekly' && <div style={{ position: 'absolute', right: 20, top: 20 }}><SpiritOrb scale={3} /></div>}
              <div>
                <div className="mono" style={{ color: 'var(--parch-2)', fontSize: 9, marginBottom: 4 }}>{e.type.toUpperCase()} · {e.d}</div>
                <div style={{ fontFamily: 'Pixelify Sans', fontSize: 22, color: 'var(--parch-0)' }}>{e.t}</div>
              </div>
            </div>
            <div style={{ padding: 14 }}>
              <div className="mono text-mute mb-2" style={{ fontSize: 9 }}>{e.meta}</div>
              <div className="text-mute mb-3" style={{ fontSize: 12 }}>{e.desc}</div>
              {e.progress > 0 && (
                <div className="mb-3">
                  <div className="row items-center justify-between mb-2"><span className="mono text-mute" style={{ fontSize: 9 }}>your progress</span><span className="mono text-ember" style={{ fontSize: 9 }}>{Math.round(e.progress * 100)}%</span></div>
                  <div className="bar"><div className="bar__fill" style={{ width: `${e.progress * 100}%` }} /></div>
                </div>
              )}
              <div className="row gap-2 mb-3" style={{ flexWrap: 'wrap' }}>
                {e.rewards.map((r, i) => <span key={i} className="badge badge--ember">{r}</span>)}
              </div>
              <div className="row gap-2">
                <button className="btn btn--primary btn--sm">{e.progress > 0 ? 'continue' : 'join'}</button>
                <button className="btn btn--sm">details</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Tavern / Podcasts ---------- */
function PodcastsScreen() {
  const [tab, setTab] = React.useState('featured');
  const [playing, setPlaying] = React.useState({ title: 'Graphs in Real Systems', host: 'Archmage Sable', ep: 'Ep. 47 · 52:14', pos: 0.34 });

  const featured = [
    { t: 'Graphs in Real Systems', h: 'Archmage Sable', d: '52 min', c: '#3d6149', tags: ['graphs', 'systems'], heard: true, ep: 47 },
    { t: 'Rituals of the Mock Interview', h: 'Mentor Vae', d: '38 min', c: '#b8692a', tags: ['career'], heard: false, ep: 46 },
    { t: 'Why the Ember Bearers fell', h: 'Chronicler Rook', d: '61 min', c: '#a23a2a', tags: ['lore', 'guild'], heard: false, ep: 45 },
    { t: 'Dungeons & Databases', h: 'Sage Moreena', d: '44 min', c: '#3b6a8f', tags: ['db', 'design'], heard: true, ep: 44 },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="TAVERN · hearthside tales"
        title="Tales by the Hearth"
        subtitle="Подкасты, гостевые лекции и живые истории из мира druz9."
        right={<span className="mono text-mute">73 listened · 142 in catalog</span>}
      />

      {/* Player bar */}
      <div className="panel panel--dark" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 200px', alignItems: 'center', gap: 16, padding: '14px 20px' }}>
          <div style={{ height: 120, background: 'linear-gradient(135deg, #3d6149 0%, #2a1f15 100%)', border: '3px solid var(--ink-0)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Fireplace scale={3} />
            <Fireflies count={4} />
          </div>
          <div>
            <div className="mono" style={{ color: 'var(--ember-3)', fontSize: 10 }}>NOW PLAYING · {playing.ep}</div>
            <div style={{ fontFamily: 'Pixelify Sans', fontSize: 22, color: 'var(--parch-0)', marginTop: 2 }}>{playing.title}</div>
            <div className="mono" style={{ color: 'var(--parch-2)', fontSize: 10, marginTop: 2 }}>with {playing.host}</div>
            <div className="bar" style={{ marginTop: 10, background: '#1a140e' }}>
              <div className="bar__fill" style={{ width: `${playing.pos * 100}%` }} />
            </div>
            <div className="row items-center justify-between mt-2">
              <span className="mono" style={{ color: 'var(--parch-2)', fontSize: 9 }}>17:42 / 52:14</span>
              <div className="row gap-2">
                <span className="tweak-chip" style={{ background: '#2a1f15', color: 'var(--parch-2)', borderColor: '#4a3028' }}>1.0×</span>
                <span className="tweak-chip" style={{ background: '#2a1f15', color: 'var(--parch-2)', borderColor: '#4a3028' }}>sleep timer</span>
              </div>
            </div>
          </div>
          <div className="row gap-2 center">
            <button className="btn btn--sm" style={{ padding: '12px 14px', fontSize: 18 }}>⏮</button>
            <button className="btn btn--primary btn--sm" style={{ padding: '14px 18px', fontSize: 20 }}>▶</button>
            <button className="btn btn--sm" style={{ padding: '12px 14px', fontSize: 18 }}>⏭</button>
          </div>
        </div>
      </div>

      <div className="tabs">
        {[['featured', 'Featured'], ['series', 'Series'], ['history', 'History'], ['saved', 'Saved (12)']].map(([id, t]) => (
          <div key={id} className={`tab ${tab === id ? 'tab--active' : ''}`} onClick={() => setTab(id)}>{t}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>
        <div>
          <h3 className="mb-3">New from the hearth</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {featured.map((p, i) => (
              <div key={i} className="panel panel--tight" style={{ padding: 12, cursor: 'pointer' }} onClick={() => setPlaying({ title: p.t, host: p.h, ep: `Ep. ${p.ep} · ${p.d}`, pos: 0 })}>
                <div className="row gap-3" style={{ alignItems: 'stretch' }}>
                  <div style={{ width: 72, height: 72, background: p.c, border: '3px solid var(--ink-0)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'Silkscreen', fontSize: 20, color: 'var(--parch-0)' }}>EP{p.ep}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Pixelify Sans', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.t}</div>
                    <div className="mono text-mute" style={{ fontSize: 9 }}>{p.h} · {p.d}</div>
                    <div className="row gap-1 mt-2" style={{ flexWrap: 'wrap' }}>
                      {p.tags.map(t => <span key={t} className="badge" style={{ fontSize: 9 }}>{t}</span>)}
                      {p.heard && <span className="badge badge--moss" style={{ fontSize: 9 }}>✓ heard</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <h3 className="mt-4 mb-3">Series</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              ['Algorithmist\'s Codex', 24, '#3d6149'],
              ['Systems Scrolls', 18, '#b8692a'],
              ['Guild Chronicles', 12, '#a23a2a'],
              ['Career Trail', 30, '#3b6a8f'],
            ].map(([n, c, col], i) => (
              <div key={i} style={{ padding: 10, border: '3px solid var(--ink-0)', background: 'var(--parch-0)', boxShadow: '3px 3px 0 var(--ink-0)' }}>
                <div style={{ height: 60, background: col, border: '2px solid var(--ink-0)', marginBottom: 6 }} />
                <div style={{ fontFamily: 'Pixelify Sans', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n}</div>
                <div className="mono text-mute" style={{ fontSize: 9 }}>{c} episodes</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="panel panel--recessed" style={{ padding: 14, marginBottom: 12 }}>
            <h3>Queue · 5</h3>
            {[
              ['up next', 'Rituals of the Mock Interview', '38m'],
              ['queued', 'Why the Ember Bearers fell', '61m'],
              ['queued', 'Dungeons & Databases', '44m'],
              ['queued', 'Scrolls of Concurrency', '28m'],
            ].map(([s, t, d], i) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: i < 3 ? '1px dashed var(--ink-3)' : 'none' }}>
                <div className="mono text-mute" style={{ fontSize: 9 }}>{s}</div>
                <div style={{ fontFamily: 'Pixelify Sans', fontSize: 12 }}>{t}</div>
                <div className="mono text-mute" style={{ fontSize: 9 }}>{d}</div>
              </div>
            ))}
          </div>

          <div className="panel">
            <h3>Listening pact</h3>
            <div className="mono text-mute mb-2" style={{ fontSize: 9 }}>this month</div>
            <div style={{ fontFamily: 'Pixelify Sans', fontSize: 32, color: 'var(--ember-1)' }}>14h 20m</div>
            <div className="bar mb-2"><div className="bar__fill" style={{ width: '71%' }} /></div>
            <div className="mono text-mute" style={{ fontSize: 9 }}>71% of 20h goal · +200 ✦ on complete</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Guild War tracker ---------- */
function GuildWarScreen({ onExit }) {
  return (
    <div>
      <PageHeader
        eyebrow="GUILD WAR · live"
        title="Mossveil vs Red Ravens"
        subtitle="Второй день затяжной войны гильдий. Фронты закрашиваются, когда одна сторона побеждает раунд."
        right={
          <div className="row gap-2">
            <button className="btn btn--sm" onClick={onExit}>back to guild hall</button>
            <button className="btn btn--primary btn--sm">deploy to front</button>
          </div>
        }
      />

      {/* Score banner */}
      <div className="panel panel--dark" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '20px 28px', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Banner scale={4} color="var(--moss-1)" crest="✦" />
            <div>
              <div style={{ fontFamily: 'Pixelify Sans', fontSize: 26, color: 'var(--parch-0)' }}>Mossveil</div>
              <div className="mono" style={{ color: 'var(--moss-2)', fontSize: 10 }}>24 members · 18 deployed</div>
              <div style={{ fontFamily: 'Pixelify Sans', fontSize: 56, color: 'var(--moss-2)', lineHeight: 1 }}>12</div>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="mono text-light" style={{ opacity: 0.6, fontSize: 9 }}>day 2 / 3</div>
            <div style={{ fontFamily: 'Pixelify Sans', fontSize: 40, color: 'var(--ember-3)' }}>vs</div>
            <div className="mono text-light" style={{ opacity: 0.8, fontSize: 10 }}>ends in 08h 42m</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexDirection: 'row-reverse', textAlign: 'right' }}>
            <Banner scale={4} color="var(--danger)" crest="▲" />
            <div>
              <div style={{ fontFamily: 'Pixelify Sans', fontSize: 26, color: 'var(--parch-0)' }}>Red Ravens</div>
              <div className="mono" style={{ color: 'var(--danger)', fontSize: 10 }}>31 members · 24 deployed</div>
              <div style={{ fontFamily: 'Pixelify Sans', fontSize: 56, color: 'var(--danger)', lineHeight: 1 }}>9</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
        {/* Fronts */}
        <div className="panel">
          <h3 className="mb-3">Active fronts · 5</h3>
          {[
            { n: 'Graphs Bastion', us: 4, them: 3, dur: '14m left', status: 'contested', hot: true },
            { n: 'Systems Tower', us: 3, them: 1, dur: '32m left', status: 'mossveil-leading' },
            { n: 'DP Canyon', us: 1, them: 4, dur: '9m left', status: 'ravens-leading', danger: true },
            { n: 'String Bridge', us: 2, them: 2, dur: '1h left', status: 'contested' },
            { n: 'Algo Plaza', us: 2, them: 0, dur: 'next round', status: 'mossveil-leading' },
          ].map((f, i) => (
            <div key={i} style={{
              padding: 12, marginBottom: 8,
              border: '3px solid var(--ink-0)',
              background: f.danger ? 'rgba(184,41,42,0.08)' : f.hot ? 'rgba(233,184,102,0.15)' : 'var(--parch-0)',
              boxShadow: '3px 3px 0 var(--ink-0)',
            }}>
              <div className="row items-center justify-between mb-2">
                <div>
                  <div style={{ fontFamily: 'Pixelify Sans', fontSize: 16 }}>{f.n}</div>
                  <div className="mono text-mute" style={{ fontSize: 9 }}>{f.dur}</div>
                </div>
                <div className="row gap-2">
                  {f.hot && <span className="badge badge--ember">hot</span>}
                  {f.danger && <span className="badge" style={{ background: 'var(--danger)', color: 'var(--parch-0)' }}>losing</span>}
                  <button className="btn btn--sm">join</button>
                </div>
              </div>
              <div className="row items-center gap-2">
                <span className="mono text-moss" style={{ fontSize: 10, width: 40 }}>{f.us}</span>
                <div style={{ flex: 1, height: 16, background: 'var(--parch-3)', border: '2px solid var(--ink-0)', display: 'flex', overflow: 'hidden' }}>
                  <div style={{ flex: f.us, background: 'var(--moss-1)' }} />
                  <div style={{ flex: f.them, background: 'var(--danger)' }} />
                </div>
                <span className="mono" style={{ fontSize: 10, color: 'var(--danger)', width: 40, textAlign: 'right' }}>{f.them}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="panel panel--tight">
            <h3>MVPs today</h3>
            {[
              ['thornmoss', 'mossveil', 4, 0, 'moss'],
              ['kyrie.dev', 'ravens', 3, 1, 'danger'],
              ['lunarfox', 'mossveil', 3, 0, 'moss'],
              ['petrogryph', 'ravens', 2, 1, 'danger'],
            ].map(([n, g, w, l, c], i) => (
              <div key={i} className="row items-center justify-between" style={{ padding: '6px 0', borderBottom: i < 3 ? '1px dashed var(--ink-3)' : 'none' }}>
                <div>
                  <div style={{ fontFamily: 'Pixelify Sans', fontSize: 13 }}>{n}</div>
                  <div className={`mono ${c === 'moss' ? 'text-moss' : ''}`} style={{ fontSize: 9, color: c === 'danger' ? 'var(--danger)' : undefined }}>{g}</div>
                </div>
                <span className="mono text-ember">{w}w · {l}l</span>
              </div>
            ))}
          </div>

          <div className="panel panel--wood">
            <h3 style={{ color: 'var(--parch-0)' }}>War feed</h3>
            <div style={{ fontSize: 11, lineHeight: 1.6, color: 'var(--parch-2)' }}>
              <div><span className="mono text-ember">2m ago ·</span> thornmoss captured Graphs Bastion round 3</div>
              <div><span className="mono text-ember">8m ago ·</span> ravens took DP Canyon +2</div>
              <div><span className="mono text-ember">14m ago ·</span> Mossveil reinforced Systems Tower</div>
              <div><span className="mono text-ember">20m ago ·</span> glowbeacon duel won +60 ELO</div>
              <div><span className="mono text-ember">27m ago ·</span> Algo Plaza established</div>
            </div>
          </div>

          <div className="panel panel--recessed">
            <div className="mono text-mute mb-2" style={{ fontSize: 9 }}>war reward · on victory</div>
            <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
              <span className="badge badge--ember">+1200 xp each</span>
              <span className="badge badge--ember">3 relic drops</span>
              <span className="badge badge--ember">+2 rank</span>
              <span className="badge badge--dark">legendary banner</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { EventsScreen, PodcastsScreen, GuildWarScreen });
