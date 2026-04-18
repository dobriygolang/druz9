/* ============================================================
   druz9 — Sprint 3 part B: Social, Settings, Season pass,
   Shop checkout modal, Notifications, Achievement drawer,
   Level-up modal, Toast system
   ============================================================ */

/* ---------- Social / Friends & Chat ---------- */
function SocialScreen() {
  const [sel, setSel] = React.useState('glowbeacon');
  const friends = [
    { id: 'glowbeacon', n: 'glowbeacon', guild: 'Red Ravens', status: 'in duel', dot: 'var(--danger)', last: '2m' },
    { id: 'lunarfox', n: 'lunarfox', guild: 'Mossveil', status: 'online · training', dot: 'var(--moss-1)', last: 'now', fav: true },
    { id: 'oakleaf', n: 'oakleaf', guild: 'Mossveil', status: 'online · hub', dot: 'var(--moss-1)', last: '1m', fav: true },
    { id: 'velvaine', n: 'velvaine', guild: 'Mossveil', status: 'away', dot: 'var(--parch-3)', last: '14m' },
    { id: 'fernglade', n: 'fernglade', guild: 'Silver Hand', status: 'in podcast', dot: 'var(--ember-1)', last: '3m' },
    { id: 'kyrie.dev', n: 'kyrie.dev', guild: 'Red Ravens', status: 'offline', dot: '#555', last: '3h' },
    { id: 'petrogryph', n: 'petrogryph', guild: 'Red Ravens', status: 'offline', dot: '#555', last: '1d' },
    { id: 'mosshen', n: 'mosshen', guild: 'Mossveil', status: 'online · arena', dot: 'var(--moss-1)', last: 'now' },
  ];
  const f = friends.find(x => x.id === sel) || friends[0];
  const msgs = [
    { who: 'them', t: 'saw your dfs solve, nice edge', at: '09:42' },
    { who: 'me', t: 'thanks! the mod was tricky', at: '09:43' },
    { who: 'them', t: 'yeah hidden large needs mod', at: '09:43' },
    { who: 'them', t: 'wanna team up tonight for raid?', at: '09:45' },
    { who: 'me', t: 'yes — 21:00 nightfall?', at: '09:46' },
    { who: 'them', t: '🔥 count me in', at: '09:46' },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="SOCIAL · friendships & pacts"
        title="The Meeting House"
        subtitle="Друзья, пакты, ежедневная болтовня. Кто онлайн — тот у костра."
        right={<button className="btn btn--primary btn--sm">add friend</button>}
      />

      <div className="panel" style={{ padding: 0, overflow: 'hidden', height: 560 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 260px', height: '100%' }}>
          {/* friends list */}
          <div style={{ borderRight: '3px dashed var(--ink-3)', overflow: 'auto' }}>
            <div style={{ padding: 12, borderBottom: '2px solid var(--ink-3)' }}>
              <input placeholder="find friend..." style={{ width: '100%', padding: '6px 8px', border: '2px solid var(--ink-0)', background: 'var(--parch-0)', fontFamily: 'IBM Plex Sans', fontSize: 12 }} />
            </div>
            <div className="sidenav__section" style={{ margin: '8px 12px' }}>FAVORITES</div>
            {friends.filter(x => x.fav).map(fr => <FriendRow key={fr.id} fr={fr} active={fr.id === sel} onClick={() => setSel(fr.id)} />)}
            <div className="sidenav__section" style={{ margin: '8px 12px' }}>ALL · 24</div>
            {friends.filter(x => !x.fav).map(fr => <FriendRow key={fr.id} fr={fr} active={fr.id === sel} onClick={() => setSel(fr.id)} />)}
          </div>

          {/* chat */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 16px', borderBottom: '3px dashed var(--ink-3)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, background: 'var(--ember-1)', border: '3px solid var(--ink-0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'Silkscreen', fontSize: 12, color: 'var(--parch-0)' }}>{f.n.slice(0, 2).toUpperCase()}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Pixelify Sans', fontSize: 16 }}>{f.n}</div>
                <div className="mono text-mute" style={{ fontSize: 9 }}>● {f.status} · {f.guild}</div>
              </div>
              <div className="row gap-2">
                <button className="btn btn--sm">profile</button>
                <button className="btn btn--sm">duel</button>
                <button className="btn btn--sm">gift</button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="text-mute center" style={{ fontSize: 10, fontFamily: 'Silkscreen' }}>— today, 09:42 —</div>
              {msgs.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.who === 'me' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '72%', padding: '8px 10px',
                    background: m.who === 'me' ? 'var(--ember-1)' : 'var(--parch-2)',
                    color: m.who === 'me' ? 'var(--parch-0)' : 'var(--ink-0)',
                    border: '3px solid var(--ink-0)',
                    boxShadow: m.who === 'me' ? '3px 3px 0 var(--ink-0)' : '3px 3px 0 var(--parch-3)',
                    fontSize: 13,
                  }}>
                    <div>{m.t}</div>
                    <div className="mono" style={{ fontSize: 9, opacity: 0.6, marginTop: 2 }}>{m.at}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: 12, borderTop: '3px dashed var(--ink-3)', display: 'flex', gap: 8 }}>
              <input placeholder="type a message..." style={{ flex: 1, padding: '10px 12px', border: '3px solid var(--ink-0)', background: 'var(--parch-0)', fontFamily: 'IBM Plex Sans' }} />
              <button className="btn btn--sm">📎</button>
              <button className="btn btn--primary btn--sm">send</button>
            </div>
          </div>

          {/* right panel - shared activity */}
          <div style={{ borderLeft: '3px dashed var(--ink-3)', padding: 14, overflow: 'auto' }}>
            <h4>Together · {f.n}</h4>
            <div className="mono text-mute mb-3" style={{ fontSize: 9 }}>shared history</div>
            {[
              ['24 duels', '12w 12l · even'],
              ['3 guild raids', 'night fall · ember peak'],
              ['8 mock sessions', 'avg 78% readiness'],
              ['14 podcasts together', 'listening party'],
            ].map(([k, v], i) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: i < 3 ? '1px dashed var(--ink-3)' : 'none' }}>
                <div style={{ fontFamily: 'Pixelify Sans', fontSize: 12 }}>{k}</div>
                <div className="mono text-mute" style={{ fontSize: 9 }}>{v}</div>
              </div>
            ))}
            <div className="divider" />
            <button className="btn btn--sm" style={{ width: '100%', marginBottom: 6 }}>invite to party</button>
            <button className="btn btn--sm" style={{ width: '100%' }}>see all memories</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FriendRow({ fr, active, onClick }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px', cursor: 'pointer',
      background: active ? 'var(--parch-2)' : 'transparent',
      borderLeft: active ? '4px solid var(--ember-1)' : '4px solid transparent',
    }}>
      <div style={{ width: 28, height: 28, background: fr.dot, border: '2px solid var(--ink-0)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'Pixelify Sans', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fr.n}{fr.fav && ' ★'}</div>
        <div className="mono text-mute" style={{ fontSize: 9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fr.status}</div>
      </div>
      <span className="mono text-mute" style={{ fontSize: 9 }}>{fr.last}</span>
    </div>
  );
}

/* ---------- Settings ---------- */
function SettingsScreen() {
  const [tab, setTab] = React.useState('account');
  const sections = {
    account: <SettingsAccount />,
    display: <SettingsDisplay />,
    notifs: <SettingsNotifs />,
    gameplay: <SettingsGameplay />,
    privacy: <SettingsPrivacy />,
  };
  return (
    <div>
      <PageHeader eyebrow="ARCANE SCROLLS · preferences" title="Scroll of Settings" subtitle="Настройки экрана, уведомлений, геймплея и приватности." />
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: 480 }}>
          <div style={{ borderRight: '3px dashed var(--ink-3)', padding: '14px 0' }}>
            {[
              ['account', 'Account', '◎'],
              ['display', 'Display', '▦'],
              ['notifs', 'Notifications', '✉'],
              ['gameplay', 'Gameplay', '⚔'],
              ['privacy', 'Privacy', '⛨'],
            ].map(([id, t, icon]) => (
              <div key={id} onClick={() => setTab(id)} style={{
                padding: '10px 16px', cursor: 'pointer',
                background: tab === id ? 'var(--parch-2)' : 'transparent',
                borderLeft: tab === id ? '4px solid var(--ember-1)' : '4px solid transparent',
                fontFamily: 'Pixelify Sans', fontSize: 14,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontFamily: 'Silkscreen', fontSize: 16, color: 'var(--ember-1)' }}>{icon}</span>
                {t}
              </div>
            ))}
          </div>
          <div style={{ padding: 24 }}>{sections[tab]}</div>
        </div>
      </div>
    </div>
  );
}

function Setting({ label, help, children }) {
  return (
    <div style={{ padding: '14px 0', borderBottom: '1px dashed var(--ink-3)', display: 'grid', gridTemplateColumns: '1fr 220px', gap: 20, alignItems: 'start' }}>
      <div>
        <div style={{ fontFamily: 'Pixelify Sans', fontSize: 14 }}>{label}</div>
        {help && <div className="text-mute" style={{ fontSize: 11, marginTop: 2 }}>{help}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}
function Toggle({ on = false }) {
  const [v, setV] = React.useState(on);
  return (
    <div onClick={() => setV(!v)} style={{ width: 56, height: 28, border: '3px solid var(--ink-0)', background: v ? 'var(--moss-1)' : 'var(--parch-3)', position: 'relative', cursor: 'pointer', boxShadow: '2px 2px 0 var(--ink-0)' }}>
      <div style={{ position: 'absolute', top: 2, left: v ? 28 : 2, width: 18, height: 18, background: 'var(--parch-0)', border: '2px solid var(--ink-0)', transition: 'left 0.1s' }} />
    </div>
  );
}

function SettingsAccount() {
  return (
    <>
      <h3 className="mb-3">Account</h3>
      <div className="row gap-3 mb-4" style={{ alignItems: 'center' }}>
        <div style={{ width: 80, height: 80, background: 'var(--ember-1)', border: '3px solid var(--ink-0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Hero scale={3} pose="wave" />
        </div>
        <div>
          <div style={{ fontFamily: 'Pixelify Sans', fontSize: 22 }}>Thornmoss</div>
          <div className="mono text-mute" style={{ fontSize: 10 }}>joined Dec 2023 · level 24 · mossveil</div>
          <div className="row gap-2 mt-2">
            <button className="btn btn--sm">change name</button>
            <button className="btn btn--sm">change avatar</button>
          </div>
        </div>
      </div>
      <Setting label="Email" help="Для смены пароля и восстановления аккаунта.">
        <input value="thornmoss@druz9.world" readOnly style={{ width: '100%', padding: '6px 8px', border: '2px solid var(--ink-0)', background: 'var(--parch-2)', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }} />
      </Setting>
      <Setting label="Two-factor auth" help="Рекомендуется для аккаунтов в гильдиях."><Toggle on /></Setting>
      <Setting label="Connected accounts" help="GitHub, Discord, LeetCode."><button className="btn btn--sm">manage</button></Setting>
      <Setting label="Danger zone" help="Удалить аккаунт и все данные.">
        <button className="btn btn--sm" style={{ background: 'var(--danger)', color: 'var(--parch-0)' }}>delete account</button>
      </Setting>
    </>
  );
}

function SettingsDisplay() {
  return (
    <>
      <h3 className="mb-3">Display</h3>
      <Setting label="Pixel scale" help="Масштаб пиксель-арта. 1 = native, 4 = HiDPI.">
        <div className="row gap-1">
          {[1, 2, 3, 4].map(s => <span key={s} className={`tweak-chip ${s === 2 ? 'tweak-chip--on' : ''}`}>{s}×</span>)}
        </div>
      </Setting>
      <Setting label="Reduce motion" help="Выключает дрейф светлячков, анимации спрайтов."><Toggle /></Setting>
      <Setting label="Ambient sound" help="Треск огня, звон монет, шум леса."><Toggle on /></Setting>
      <Setting label="UI sound" help="Пиксельные звуки кликов, открытия сундуков."><Toggle on /></Setting>
      <Setting label="Font density" help="Размер базового UI-текста.">
        <div className="row gap-1">
          {['S', 'M', 'L', 'XL'].map(s => <span key={s} className={`tweak-chip ${s === 'M' ? 'tweak-chip--on' : ''}`}>{s}</span>)}
        </div>
      </Setting>
      <Setting label="Colour palette" help="Доступные темы: parchment, ironveil (dark), ember-only (high contrast).">
        <div className="row gap-2">
          {[['parchment', 'var(--parch-0)'], ['ironveil', '#2a2a38'], ['ember', '#7a3d12']].map(([n, c]) => (
            <div key={n} style={{ width: 56, height: 38, background: c, border: '3px solid var(--ink-0)', boxShadow: n === 'parchment' ? '2px 2px 0 var(--ember-1)' : '2px 2px 0 var(--ink-3)', cursor: 'pointer' }} />
          ))}
        </div>
      </Setting>
    </>
  );
}

function SettingsNotifs() {
  return (
    <>
      <h3 className="mb-3">Notifications</h3>
      {[
        ['Duel invites', 'когда тебя вызывают на дуэль', true],
        ['Guild war start', 'старт войны гильдии и фронтов', true],
        ['Friend online', 'когда друг из избранного заходит', false],
        ['Weekly challenge reset', 'каждый понедельник 09:00', true],
        ['Event reminders', 'за 1h до старта ивента', true],
        ['Mentor session ready', 'AI mentor готов к сессии', true],
        ['Podcast new episode', 'новый эпизод в подписке', false],
        ['Marketing & seasonal', 'новинки в магазине, сезонные промо', false],
      ].map(([l, h, on], i) => (
        <Setting key={i} label={l} help={h}><Toggle on={on} /></Setting>
      ))}
    </>
  );
}

function SettingsGameplay() {
  return (
    <>
      <h3 className="mb-3">Gameplay</h3>
      <Setting label="Default duel difficulty" help="Автовыбор при 'find duel'.">
        <div className="row gap-1">
          {['easy', 'medium', 'hard', 'mythic'].map(s => <span key={s} className={`tweak-chip ${s === 'medium' ? 'tweak-chip--on' : ''}`}>{s}</span>)}
        </div>
      </Setting>
      <Setting label="Auto-accept guild raids" help="Мгновенный join, когда гильдия открывает рейд."><Toggle /></Setting>
      <Setting label="Streak shield" help="Один пропущенный день в неделю не ломает серию."><Toggle on /></Setting>
      <Setting label="Preferred IDE theme" help="В дуэлях и тренировках.">
        <div className="row gap-1">
          {['ember', 'moss', 'dusk'].map(s => <span key={s} className={`tweak-chip ${s === 'ember' ? 'tweak-chip--on' : ''}`}>{s}</span>)}
        </div>
      </Setting>
      <Setting label="Show opponent typing" help="Видеть, когда соперник печатает код в дуэли."><Toggle on /></Setting>
      <Setting label="Hint frequency" help="Как часто AI-ментор предлагает подсказки.">
        <div className="row gap-1">
          {['none', 'rare', 'normal', 'often'].map(s => <span key={s} className={`tweak-chip ${s === 'normal' ? 'tweak-chip--on' : ''}`}>{s}</span>)}
        </div>
      </Setting>
    </>
  );
}

function SettingsPrivacy() {
  return (
    <>
      <h3 className="mb-3">Privacy</h3>
      <Setting label="Visible on leaderboard" help="Показывать имя в публичных топах."><Toggle on /></Setting>
      <Setting label="Allow profile visits" help="Кто может зайти в твою комнату.">
        <div className="row gap-1">
          {['nobody', 'friends', 'guild', 'anyone'].map(s => <span key={s} className={`tweak-chip ${s === 'guild' ? 'tweak-chip--on' : ''}`}>{s}</span>)}
        </div>
      </Setting>
      <Setting label="Duel invites from" help="Кто может вызывать на дуэль.">
        <div className="row gap-1">
          {['friends', 'guild', 'rank ±100', 'anyone'].map(s => <span key={s} className={`tweak-chip ${s === 'rank ±100' ? 'tweak-chip--on' : ''}`}>{s}</span>)}
        </div>
      </Setting>
      <Setting label="Show online status"><Toggle on /></Setting>
      <Setting label="Chat filter" help="Фильтр предустановленных фраз от незнакомцев.">
        <div className="row gap-1">
          {['off', 'mild', 'strict'].map(s => <span key={s} className={`tweak-chip ${s === 'mild' ? 'tweak-chip--on' : ''}`}>{s}</span>)}
        </div>
      </Setting>
      <Setting label="Export my data" help="Скачать JSON всех твоих ачивок, истории дуэлей и настроек."><button className="btn btn--sm">request export</button></Setting>
    </>
  );
}

/* ---------- Season Pass ---------- */
function SeasonPassScreen() {
  const tiers = Array.from({ length: 40 }).map((_, i) => {
    const tier = i + 1;
    const owned = tier <= 18;
    const premium = tier <= 12;
    const isMilestone = tier % 10 === 0;
    return { tier, owned, premium, isMilestone };
  });

  return (
    <div>
      <PageHeader
        eyebrow="SEASON III · ember & oak"
        title="The Ember Pact"
        subtitle="Сезонный пропуск. Каждый уровень = награда. 19 дней до конца сезона."
        right={
          <div className="row gap-2">
            <span className="mono text-mute">tier 18 / 40</span>
            <button className="btn btn--primary btn--sm">upgrade to premium</button>
          </div>
        }
      />

      <div className="panel panel--dark" style={{ padding: '16px 20px', marginBottom: 14 }}>
        <div className="row items-center justify-between mb-3">
          <div>
            <div className="mono" style={{ color: 'var(--ember-3)', fontSize: 10 }}>CURRENT TIER</div>
            <div style={{ fontFamily: 'Pixelify Sans', fontSize: 38, color: 'var(--parch-0)', lineHeight: 1 }}>Tier 18 · Knight of Ember</div>
            <div className="mono" style={{ color: 'var(--parch-2)', fontSize: 10, marginTop: 2 }}>3,420 / 5,000 xp until tier 19</div>
          </div>
          <div className="row gap-2">
            <Trophy scale={3} tier="gold" />
            <Trophy scale={3} tier="silver" />
          </div>
        </div>
        <div className="bar" style={{ background: '#1a140e', height: 14 }}>
          <div className="bar__fill" style={{ width: '68%' }} />
        </div>
      </div>

      {/* Free vs Premium tracks */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 1200, padding: 16 }}>
            {/* Premium row */}
            <div className="row gap-1 mb-1" style={{ alignItems: 'stretch' }}>
              <div style={{ width: 110, flexShrink: 0, padding: 10, background: 'var(--ember-1)', border: '3px solid var(--ink-0)', color: 'var(--parch-0)' }}>
                <div className="mono" style={{ fontSize: 9 }}>PREMIUM</div>
                <div style={{ fontFamily: 'Pixelify Sans', fontSize: 14 }}>ember track</div>
                <div className="mono" style={{ fontSize: 9, marginTop: 4 }}>1200 💎</div>
              </div>
              <div style={{ display: 'flex', gap: 4, overflow: 'hidden' }}>
                {tiers.slice(0, 20).map(t => <TierCell key={t.tier} t={t} track="premium" />)}
              </div>
            </div>
            {/* Tier number row */}
            <div className="row gap-1 mb-1" style={{ paddingLeft: 114 }}>
              {tiers.slice(0, 20).map(t => (
                <div key={t.tier} style={{ width: 50, textAlign: 'center', fontFamily: 'Pixelify Sans', fontSize: 12, color: t.owned ? 'var(--ember-1)' : 'var(--ink-2)' }}>
                  {t.tier}
                </div>
              ))}
            </div>
            {/* Free row */}
            <div className="row gap-1" style={{ alignItems: 'stretch' }}>
              <div style={{ width: 110, flexShrink: 0, padding: 10, background: 'var(--moss-1)', border: '3px solid var(--ink-0)', color: 'var(--parch-0)' }}>
                <div className="mono" style={{ fontSize: 9 }}>FREE</div>
                <div style={{ fontFamily: 'Pixelify Sans', fontSize: 14 }}>oak track</div>
                <div className="mono" style={{ fontSize: 9, marginTop: 4 }}>included</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {tiers.slice(0, 20).map(t => <TierCell key={t.tier} t={t} track="free" />)}
              </div>
            </div>

            {/* Second row of tiers 21-40 */}
            <div style={{ marginTop: 24 }}>
              <div className="row gap-1 mb-1" style={{ alignItems: 'stretch' }}>
                <div style={{ width: 110, flexShrink: 0 }} />
                <div style={{ display: 'flex', gap: 4 }}>
                  {tiers.slice(20).map(t => <TierCell key={t.tier} t={t} track="premium" />)}
                </div>
              </div>
              <div className="row gap-1 mb-1" style={{ paddingLeft: 114 }}>
                {tiers.slice(20).map(t => (
                  <div key={t.tier} style={{ width: 50, textAlign: 'center', fontFamily: 'Pixelify Sans', fontSize: 12, color: t.owned ? 'var(--ember-1)' : 'var(--ink-2)' }}>{t.tier}</div>
                ))}
              </div>
              <div className="row gap-1" style={{ alignItems: 'stretch' }}>
                <div style={{ width: 110, flexShrink: 0 }} />
                <div style={{ display: 'flex', gap: 4 }}>
                  {tiers.slice(20).map(t => <TierCell key={t.tier} t={t} track="free" />)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginTop: 14 }}>
        <div className="panel panel--tight">
          <div className="mono text-mute" style={{ fontSize: 9 }}>weekly bonus</div>
          <h3>Solve 15 tasks</h3>
          <div className="bar mb-2"><div className="bar__fill" style={{ width: '53%' }} /></div>
          <div className="mono text-mute" style={{ fontSize: 9 }}>8 / 15 · +500 pass xp</div>
        </div>
        <div className="panel panel--tight">
          <div className="mono text-mute" style={{ fontSize: 9 }}>guild mission</div>
          <h3>3 war fronts captured</h3>
          <div className="bar mb-2"><div className="bar__fill" style={{ width: '66%' }} /></div>
          <div className="mono text-mute" style={{ fontSize: 9 }}>2 / 3 · +300 pass xp each</div>
        </div>
        <div className="panel panel--tight">
          <div className="mono text-mute" style={{ fontSize: 9 }}>season quest</div>
          <h3>Light all the beacons</h3>
          <div className="bar mb-2"><div className="bar__fill" style={{ width: '40%' }} /></div>
          <div className="mono text-mute" style={{ fontSize: 9 }}>4 / 10 · legendary banner</div>
        </div>
      </div>
    </div>
  );
}

function TierCell({ t, track }) {
  const rewards = [
    { f: 'gold', p: 'gems' },
    { f: 'xp', p: 'frame' },
    { f: 'gold', p: 'pet' },
    { f: 'emote', p: 'banner' },
    { f: 'xp', p: 'aura' },
  ];
  const r = rewards[t.tier % rewards.length];
  const kind = track === 'premium' ? r.p : r.f;
  const bg = t.owned ? (track === 'premium' ? 'var(--ember-2)' : 'var(--moss-2)') : 'var(--parch-2)';
  const iconMap = {
    gold: '#dcc690',
    gems: '#8fb8d4',
    xp: '#9fb89a',
    frame: '#b8692a',
    pet: '#3d6149',
    emote: '#a27ac8',
    banner: '#a23a2a',
    aura: '#e9b866',
  };
  return (
    <div style={{
      width: 50, height: 56,
      background: bg,
      border: t.isMilestone ? '3px solid var(--ember-1)' : '2px solid var(--ink-0)',
      boxShadow: t.owned ? '2px 2px 0 var(--ink-0)' : 'none',
      opacity: !t.owned && track === 'premium' ? 0.5 : 1,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 2, flexShrink: 0, position: 'relative',
    }}>
      <div style={{ width: 22, height: 22, background: iconMap[kind], border: '2px solid var(--ink-0)' }} />
      <div className="mono" style={{ fontSize: 8, color: t.owned ? 'var(--ink-0)' : 'var(--ink-2)' }}>{kind}</div>
      {t.owned && <div style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, background: 'var(--moss-1)', border: '2px solid var(--ink-0)', color: 'var(--parch-0)', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Silkscreen' }}>✓</div>}
    </div>
  );
}

/* ---------- Shop checkout modal ---------- */
function CheckoutModal({ item, onClose, onPurchased }) {
  const [preview, setPreview] = React.useState('room');
  if (!item) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal panel panel--nailed" style={{ padding: 24, maxWidth: 880 }} onClick={e => e.stopPropagation()}>
        <div className="row items-center justify-between mb-3">
          <div>
            <div className="mono" style={{ color: 'var(--ember-1)' }}>CHECKOUT · {item.category}</div>
            <h2 style={{ whiteSpace: 'normal' }}>{item.name}</h2>
          </div>
          <button className="btn btn--sm" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 18 }}>
          {/* Preview */}
          <div>
            <div className="panel panel--recessed" style={{ height: 260, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, #3d6149 0%, #1a140e 100%)', border: '3px solid var(--ink-0)' }}>
              {preview === 'room' && (
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <div style={{ position: 'absolute', left: 40, bottom: 20 }}><Bookshelf scale={3} /></div>
                  <div style={{ position: 'absolute', left: 160, bottom: 20 }}><Banner scale={3} color={item.color || '#3d6149'} /></div>
                  <div style={{ position: 'absolute', left: '45%', bottom: 20 }}><Hero scale={4} pose="idle" /></div>
                  <div style={{ position: 'absolute', right: 60, bottom: 20 }}><Fireplace scale={3} /></div>
                  <Fireflies count={6} />
                </div>
              )}
              {preview === 'hero' && <div style={{ transform: 'scale(2)' }}><Hero scale={5} pose="trophy" /></div>}
              {preview === 'inventory' && (
                <div style={{ width: 100, height: 100, background: item.color || '#3d6149', border: '4px solid var(--ink-0)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '6px 6px 0 rgba(0,0,0,0.4)' }}>
                  <span style={{ fontFamily: 'Pixelify Sans', fontSize: 14, color: 'var(--parch-0)' }}>item</span>
                </div>
              )}
            </div>
            <div className="row gap-2 mt-2 center">
              {[['room', 'In room'], ['hero', 'On hero'], ['inventory', 'Isolated']].map(([id, t]) => (
                <span key={id} className={`tweak-chip ${preview === id ? 'tweak-chip--on' : ''}`} onClick={() => setPreview(id)}>{t}</span>
              ))}
            </div>

            <div className="divider" />
            <div className="text-mute mb-3">{item.desc || 'Премиальный предмет для твоей коллекции. Лимитированный сезон III.'}</div>
            <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
              <span className={`badge rarity-border--${item.rarity || 'rare'}`}>{item.rarity || 'rare'}</span>
              <span className="badge">season III</span>
              <span className="badge">limited · 14 days left</span>
            </div>
          </div>

          {/* Receipt */}
          <div className="panel panel--recessed" style={{ padding: 14 }}>
            <div className="mono text-mute mb-2" style={{ fontSize: 9 }}>receipt</div>
            <div className="row items-center justify-between" style={{ padding: '6px 0', borderBottom: '1px dashed var(--ink-3)' }}>
              <span style={{ fontFamily: 'Pixelify Sans' }}>{item.name}</span>
              <span className="mono">{item.priceGold || 1200} gp</span>
            </div>
            <div className="row items-center justify-between" style={{ padding: '6px 0', borderBottom: '1px dashed var(--ink-3)' }}>
              <span className="text-mute" style={{ fontSize: 11 }}>guild discount · 10%</span>
              <span className="mono text-moss">-120 gp</span>
            </div>
            <div className="row items-center justify-between" style={{ padding: '6px 0', borderBottom: '1px dashed var(--ink-3)' }}>
              <span className="text-mute" style={{ fontSize: 11 }}>season pass · +1 tier</span>
              <span className="mono text-ember">free</span>
            </div>
            <div className="row items-center justify-between" style={{ padding: '10px 0' }}>
              <span style={{ fontFamily: 'Pixelify Sans', fontSize: 18 }}>total</span>
              <span style={{ fontFamily: 'Pixelify Sans', fontSize: 22, color: 'var(--ember-1)' }}>{(item.priceGold || 1200) - 120} gp</span>
            </div>

            <div className="mono text-mute mb-2 mt-2" style={{ fontSize: 9 }}>pay with</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div className="panel panel--tight" style={{ padding: 8, border: '3px solid var(--ember-1)', cursor: 'pointer' }}>
                <PixelCoin scale={2} />
                <div className="mono" style={{ fontSize: 9, marginTop: 4 }}>8,420 gp</div>
              </div>
              <div className="panel panel--tight" style={{ padding: 8, cursor: 'pointer' }}>
                <div style={{ width: 18, height: 18, background: '#8fb8d4', border: '2px solid var(--ink-0)', transform: 'rotate(45deg)' }} />
                <div className="mono" style={{ fontSize: 9, marginTop: 4 }}>124 💎</div>
              </div>
            </div>

            <button className="btn btn--primary" style={{ width: '100%', marginTop: 14 }} onClick={() => { onPurchased && onPurchased(item); onClose(); }}>confirm · 1080 gp</button>
            <button className="btn btn--ghost btn--sm" style={{ width: '100%', marginTop: 6 }} onClick={onClose}>try on (1h free)</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Inventory modal (accessed from shop) ---------- */
function InventoryModal({ onClose }) {
  const [cat, setCat] = React.useState('all');
  const items = [
    { n: 'Moss Banner', c: '#3d6149', r: 'rare', cat: 'deco' },
    { n: 'Ember Torch', c: '#b8692a', r: 'common', cat: 'deco' },
    { n: 'Oak Bookshelf', c: '#7a593a', r: 'common', cat: 'deco' },
    { n: 'Raven Familiar', c: '#3b2a1e', r: 'legendary', cat: 'pet', equipped: true },
    { n: 'Moss Slime', c: '#6b8a6a', r: 'common', cat: 'pet' },
    { n: 'Spirit Orb', c: '#8fb8d4', r: 'epic', cat: 'pet' },
    { n: 'Knight Armor', c: '#5a3f27', r: 'rare', cat: 'gear', equipped: true },
    { n: 'Scholar Robe', c: '#3b6a8f', r: 'uncommon', cat: 'gear' },
    { n: 'Ember Crown', c: '#e9b866', r: 'legendary', cat: 'gear' },
    { n: 'Stone Statue', c: '#9fb89a', r: 'epic', cat: 'deco' },
    { n: 'Autumn Frame', c: '#b8692a', r: 'rare', cat: 'frame', equipped: true },
    { n: 'Winter Frame', c: '#d4e2ec', r: 'rare', cat: 'frame' },
    { n: 'Gold Chest', c: '#dcc690', r: 'rare', cat: 'deco' },
    { n: 'Ember Aura', c: '#e9b866', r: 'epic', cat: 'aura', equipped: true },
    { n: 'Moss Aura', c: '#3d6149', r: 'rare', cat: 'aura' },
    { n: 'Trophy Shelf', c: '#a23a2a', r: 'epic', cat: 'deco' },
  ];
  const cats = [['all', 'All', 24], ['deco', 'Decor', 8], ['pet', 'Pets', 3], ['gear', 'Gear', 6], ['frame', 'Frames', 4], ['aura', 'Auras', 3]];
  const filtered = cat === 'all' ? items : items.filter(x => x.cat === cat);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal panel panel--nailed" style={{ padding: 20, maxWidth: 960 }} onClick={e => e.stopPropagation()}>
        <div className="row items-center justify-between mb-3">
          <div>
            <div className="mono text-mute" style={{ fontSize: 10 }}>INVENTORY · 24 owned</div>
            <h2 style={{ whiteSpace: 'normal', margin: 0 }}>Your treasures</h2>
          </div>
          <button className="btn btn--sm" onClick={onClose}>✕</button>
        </div>

        <div className="tabs" style={{ marginBottom: 12 }}>
          {cats.map(([id, t, n]) => (
            <div key={id} className={`tab ${cat === id ? 'tab--active' : ''}`} onClick={() => setCat(id)}>{t} · {n}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, maxHeight: 460, overflow: 'auto' }}>
          {filtered.map((it, i) => (
            <div key={i} className={`rarity-border--${it.r}`} style={{ padding: 8, border: '3px solid var(--ink-0)', background: 'var(--parch-0)', position: 'relative', cursor: 'pointer' }}>
              <div style={{ height: 58, background: it.c, border: '2px solid var(--ink-0)', marginBottom: 4 }} />
              <div style={{ fontFamily: 'Pixelify Sans', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.n}</div>
              <div className="mono text-mute" style={{ fontSize: 8 }}>{it.r}</div>
              {it.equipped && <span className="badge badge--ember" style={{ position: 'absolute', top: 4, right: 4, fontSize: 8, padding: '2px 4px' }}>equipped</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Notifications ---------- */
function NotificationsPanel({ onClose }) {
  const groups = [
    {
      k: 'TODAY',
      items: [
        { kind: 'duel', t: 'glowbeacon challenged you', d: 'Graphs · medium · 14m ago', hot: true },
        { kind: 'guild', t: 'Guild war — DP Canyon is losing', d: '30m ago', hot: true },
        { kind: 'friend', t: 'lunarfox just hit ELO 1800', d: '1h ago' },
        { kind: 'event', t: 'Harvest Festival · 3 apples from milestone', d: '2h ago' },
      ],
    },
    {
      k: 'YESTERDAY',
      items: [
        { kind: 'system', t: 'Tier 18 unlocked — Knight of Ember', d: 'season pass' },
        { kind: 'mentor', t: 'System Design mentor left feedback', d: '18h ago' },
        { kind: 'shop', t: 'Limited item: Ember Crown back in stock', d: '22h ago' },
      ],
    },
  ];
  const iconFor = (k) => ({ duel: '⚔', guild: '⚑', friend: '✦', event: '◈', system: '★', mentor: '◎', shop: '$' })[k] || '•';
  const colorFor = (k) => ({ duel: 'var(--danger)', guild: 'var(--moss-1)', friend: 'var(--ember-1)', event: 'var(--r-epic)', system: 'var(--ember-1)', mentor: 'var(--r-legendary)', shop: 'var(--ember-2)' })[k];

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 380, zIndex: 60, background: 'var(--parch-1)', border: '4px solid var(--ink-0)', boxShadow: '-6px 0 0 var(--ink-0)', display: 'flex', flexDirection: 'column', animation: 'slidein 0.18s ease-out' }}>
      <div style={{ padding: '14px 16px', borderBottom: '3px dashed var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="mono text-mute" style={{ fontSize: 10 }}>HERALD'S DESK</div>
          <h3 style={{ margin: 0 }}>Notifications · 7</h3>
        </div>
        <div className="row gap-2">
          <button className="btn btn--sm">mark all read</button>
          <button className="btn btn--sm" onClick={onClose}>✕</button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {groups.map(g => (
          <div key={g.k}>
            <div className="sidenav__section" style={{ margin: '10px 14px 4px' }}>{g.k}</div>
            {g.items.map((n, i) => (
              <div key={i} style={{
                padding: '10px 14px', borderBottom: '1px dashed var(--ink-3)',
                display: 'flex', gap: 10, alignItems: 'flex-start',
                background: n.hot ? 'rgba(233,184,102,0.08)' : 'transparent',
                cursor: 'pointer',
              }}>
                <div style={{ width: 28, height: 28, background: colorFor(n.kind), border: '2px solid var(--ink-0)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--parch-0)', fontFamily: 'Silkscreen', flexShrink: 0 }}>{iconFor(n.kind)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Pixelify Sans', fontSize: 13, lineHeight: 1.3 }}>{n.t}</div>
                  <div className="mono text-mute" style={{ fontSize: 9, marginTop: 2 }}>{n.d}</div>
                </div>
                {n.hot && <span style={{ width: 8, height: 8, background: 'var(--ember-1)', border: '2px solid var(--ink-0)' }} />}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ padding: 10, borderTop: '3px dashed var(--ink-3)' }}>
        <button className="btn btn--sm" style={{ width: '100%' }}>notification preferences</button>
      </div>
    </div>
  );
}

/* ---------- Achievement detail drawer ---------- */
function AchievementDrawer({ open, onClose, achievement }) {
  if (!open) return null;
  const a = achievement || {
    t: 'Siegebreaker', rare: 'epic', desc: 'Win a guild war as an active deployed member.',
    earned: 'season II · day 12', story: 'Во время долгой осады Ashford Mossveil продержала три фронта до рассвета. Ты был среди них.', progress: 1,
    steps: [['Join a guild', true], ['Deploy in a war', true], ['Capture 3 fronts', true], ['Survive to victory', true]],
    pinned: true,
  };
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 70, padding: '0 0 0 228px' }}>
      <div className="panel panel--nailed" style={{ padding: 0, borderBottomWidth: 0, margin: 0, animation: 'slideup 0.2s' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 220px', gap: 20, padding: 18, alignItems: 'center' }}>
          <div className={`rarity-border--${a.rare}`} style={{ width: 140, height: 140, border: '4px solid var(--ink-0)', background: 'var(--parch-0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trophy scale={4} tier="gold" />
          </div>
          <div>
            <div className="mono text-mute" style={{ fontSize: 10 }}>ACHIEVEMENT · {a.rare}</div>
            <h2 style={{ whiteSpace: 'normal', margin: '4px 0' }}>{a.t}</h2>
            <div className="text-mute mb-2" style={{ fontSize: 12 }}>{a.desc}</div>
            <div className="mono text-mute" style={{ fontSize: 10, fontStyle: 'italic' }}>"{a.story}"</div>
            <div className="divider" style={{ margin: '12px 0' }} />
            <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
              {a.steps.map(([s, done], i) => (
                <div key={i} className="row items-center gap-2">
                  <div style={{ width: 16, height: 16, background: done ? 'var(--moss-1)' : 'var(--parch-3)', border: '2px solid var(--ink-0)', color: 'var(--parch-0)', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Silkscreen' }}>{done && '✓'}</div>
                  <span style={{ fontSize: 12, color: done ? 'var(--ink-0)' : 'var(--ink-2)' }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="mono text-mute" style={{ fontSize: 9 }}>earned</div>
            <div style={{ fontFamily: 'Pixelify Sans', fontSize: 14, marginBottom: 10 }}>{a.earned}</div>
            <div className="row gap-2 mb-2" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn--sm">{a.pinned ? '★ pinned' : 'pin'}</button>
              <button className="btn btn--sm">share</button>
            </div>
            <button className="btn btn--ghost btn--sm" onClick={onClose}>close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Level-up modal with confetti ---------- */
function LevelUpModal({ open, level, onClose }) {
  if (!open) return null;
  const confetti = Array.from({ length: 24 }).map((_, i) => ({
    x: Math.random() * 100,
    delay: Math.random() * 0.6,
    dur: 2 + Math.random() * 1.4,
    c: ['var(--ember-1)', 'var(--moss-1)', 'var(--r-legendary)', 'var(--r-epic)'][i % 4],
    r: Math.random() * 360,
  }));
  return (
    <div className="modal-backdrop" onClick={onClose}>
      {confetti.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${p.x}%`, top: -20,
          width: 10, height: 14, background: p.c, border: '2px solid var(--ink-0)',
          animation: `confettifall ${p.dur}s ${p.delay}s linear infinite`,
          transform: `rotate(${p.r}deg)`,
        }} />
      ))}
      <div className="modal panel panel--nailed" style={{ padding: 40, maxWidth: 520, textAlign: 'center', position: 'relative' }} onClick={e => e.stopPropagation()}>
        <div className="mono" style={{ color: 'var(--ember-1)', marginBottom: 10 }}>LEVEL UP</div>
        <div style={{ fontFamily: 'Pixelify Sans', fontSize: 88, color: 'var(--ember-1)', lineHeight: 1, textShadow: '6px 6px 0 var(--ink-0)' }}>{level}</div>
        <h2 style={{ whiteSpace: 'normal', margin: '14px 0 6px' }}>Knight of Ember</h2>
        <div className="text-mute mb-4">Ты достиг нового титула. Открыты новые эмблемы, фон и +1 слот в гильдии.</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 18 }}>
          <Hero scale={5} pose="trophy" />
          <Fireflies count={10} />
        </div>
        <div className="row gap-2 center mb-4" style={{ flexWrap: 'wrap' }}>
          <span className="badge badge--ember">+500 gold</span>
          <span className="badge badge--ember">+1 guild slot</span>
          <span className="badge badge--ember">new frame · ember</span>
          <span className="badge badge--dark">title: Knight of Ember</span>
        </div>
        <div className="row gap-2 center">
          <button className="btn btn--sm" onClick={onClose}>later</button>
          <button className="btn btn--primary btn--sm" onClick={onClose}>claim rewards</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Toast system ---------- */
function ToastStack({ toasts, onDismiss }) {
  return (
    <div style={{ position: 'fixed', top: 110, right: 20, zIndex: 80, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {toasts.map(t => (
        <div key={t.id} className="panel panel--nailed" style={{ padding: '12px 16px', minWidth: 280, animation: 'toastin 0.2s ease-out', cursor: 'pointer' }} onClick={() => onDismiss(t.id)}>
          <div className="row items-center gap-3">
            <div style={{ width: 34, height: 34, background: t.color || 'var(--ember-1)', border: '3px solid var(--ink-0)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--parch-0)', fontFamily: 'Silkscreen', fontSize: 16, flexShrink: 0 }}>{t.icon || '✦'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mono" style={{ fontSize: 9, color: 'var(--ember-1)' }}>{t.kind || 'QUEST'}</div>
              <div style={{ fontFamily: 'Pixelify Sans', fontSize: 14 }}>{t.title}</div>
              {t.body && <div className="text-mute" style={{ fontSize: 11 }}>{t.body}</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, {
  SocialScreen, SettingsScreen, SeasonPassScreen,
  CheckoutModal, InventoryModal, NotificationsPanel,
  AchievementDrawer, LevelUpModal, ToastStack,
});
