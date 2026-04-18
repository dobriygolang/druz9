/* ============================================================
   druz9 — Design System reference screen
   ============================================================ */

function DSScreen() {
  return (
    <div>
      <PageHeader
        eyebrow="DESIGN SYSTEM · ink & parchment"
        title="Pixel RPG · Design Language"
        subtitle="Единый визуальный словарь druz9. Палитра, шрифты, компоненты, паттерны."
      />

      {/* Palette */}
      <div className="panel mb-6">
        <h3>Palette</h3>
        <div className="mono text-mute mb-3">parchment day · inked umber · moss · ember · rarity</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {[
            ['parchment', ['#f6ead0', '#ecdcb2', '#dcc690', '#c7ab6e', '#a88850']],
            ['ink', ['#3b2a1a', '#5a3f27', '#7a593a', '#9a7a54', '#dcc690']],
            ['moss', ['#2d4a35', '#3d6149', '#6b8a6a', '#9fb89a', '#d4e2cc']],
            ['ember', ['#7a3d12', '#b8692a', '#d48a3c', '#e9b866', '#f4d89e']],
            ['rarity', ['#8a735a', '#5a7f4c', '#3b6a8f', '#7a4a8f', '#b8782a']],
          ].map(([name, shades]) => (
            <div key={name}>
              <div className="mono text-mute" style={{ fontSize: 9, marginBottom: 4 }}>{name}</div>
              <div style={{ display: 'flex' }}>
                {shades.map((c, i) => (
                  <div key={i} style={{ flex: 1, height: 50, background: c, border: '2px solid var(--ink-0)', marginLeft: i ? -2 : 0 }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Type */}
      <div className="panel mb-6">
        <h3>Type</h3>
        <div className="mono text-mute mb-3">Pixelify Sans (display) · Silkscreen (mono / labels) · IBM Plex Sans (body)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <h1 style={{ margin: 0 }}>Ember Pact</h1>
            <h2>Guild Hall of Mossveil</h2>
            <h3>Recent journey</h3>
            <h4>daily pacts</h4>
            <div className="mono">silkscreen · level 24 · rank 412</div>
          </div>
          <div>
            <p>Body text uses IBM Plex Sans at 14px for readability. Используется для описаний, заданий, диалогов мастера — всегда там, где пользователь читает, а не только сканирует.</p>
            <p className="text-mute small">Small muted text: метаданные, таймстампы, подсказки — 12px, inked umber shade.</p>
          </div>
        </div>
      </div>

      {/* Panels */}
      <div className="panel mb-6">
        <h3>Pixel panels</h3>
        <div className="mono text-mute mb-3">4 материала: parchment · recessed · wood · dark</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <div className="panel panel--tight"><div className="mono">parchment</div><div className="text-mute small">default surface</div></div>
          <div className="panel panel--recessed panel--tight"><div className="mono">recessed</div><div className="text-mute small">inset section</div></div>
          <div className="panel panel--wood panel--tight"><div className="mono" style={{ color: 'var(--parch-0)' }}>wood</div><div className="small" style={{ color: 'var(--parch-2)' }}>merchant / guild</div></div>
          <div className="panel panel--dark panel--tight"><div className="mono" style={{ color: 'var(--parch-0)' }}>dark</div><div className="small" style={{ color: 'var(--parch-2)' }}>arena / night</div></div>
        </div>
      </div>

      {/* Buttons */}
      <div className="panel mb-6">
        <h3>Buttons</h3>
        <div className="row gap-3 items-center mb-3" style={{ flexWrap: 'wrap' }}>
          <button className="btn">default</button>
          <button className="btn btn--primary">primary</button>
          <button className="btn btn--moss">moss</button>
          <button className="btn btn--ghost">ghost</button>
          <button className="btn btn--sm">small</button>
          <button className="btn btn--primary btn--sm">small primary</button>
        </div>
        <div className="mono text-mute">Every button has a 3px bottom-right ink shadow, drops 2px on :active. No rounded corners.</div>
      </div>

      {/* Badges + rarity */}
      <div className="panel mb-6">
        <h3>Badges & rarity</h3>
        <div className="row gap-2 mb-3" style={{ flexWrap: 'wrap' }}>
          <span className="badge">default</span>
          <span className="badge badge--moss">moss</span>
          <span className="badge badge--ember">ember</span>
          <span className="badge badge--dark">dark</span>
        </div>
        <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
          {['common', 'uncommon', 'rare', 'epic', 'legendary'].map(r => (
            <div key={r} className={`rarity-border--${r}`} style={{ padding: 10, border: '3px solid var(--ink-0)', background: 'var(--parch-0)', minWidth: 120 }}>
              <div className={`rarity rarity--${r}`}>{r}</div>
              <div className="small text-mute">rarity tier</div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress + currency */}
      <div className="panel mb-6">
        <h3>Progress & currency</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div className="mono text-mute small mb-2">xp bar · ember stripe</div>
            <div className="bar mb-3"><div className="bar__fill" style={{ width: '64%' }} /></div>
            <div className="mono text-mute small mb-2">guild progress · moss stripe</div>
            <div className="bar"><div className="bar__fill bar__fill--moss" style={{ width: '38%' }} /></div>
          </div>
          <div className="row gap-4 items-center">
            <div className="coin" style={{ fontSize: 18 }}><PixelCoin scale={3} />8,420 gold</div>
            <div className="coin" style={{ fontSize: 18 }}>
              <span style={{ width: 14, height: 14, background: '#8fb8d4', border: '2px solid var(--ink-0)', transform: 'rotate(45deg)', display: 'inline-block' }} />
              124 gems
            </div>
          </div>
        </div>
      </div>

      {/* Quest cards */}
      <div className="panel mb-6">
        <h3>Quest & list patterns</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <div className="quest quest--active">
              <div className="quest__check" />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Pixelify Sans' }}>Active quest</div>
                <div className="mono text-mute small">ember-left accent = in progress</div>
              </div>
              <span className="mono">2/3</span>
            </div>
            <div className="quest quest--done">
              <div className="quest__check" />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Pixelify Sans' }}>Completed quest</div>
                <div className="mono text-mute small">moss check = done</div>
              </div>
              <span className="mono">✓</span>
            </div>
          </div>
          <div>
            <div className="tabs">
              <div className="tab tab--active">featured</div>
              <div className="tab">new</div>
              <div className="tab">sale</div>
            </div>
            <div className="mono text-mute small">Tabs: active has ember top-inset, sits on top of a 4px ink underline.</div>
          </div>
        </div>
      </div>

      {/* Item cards */}
      <div className="panel mb-6">
        <h3>Item cards</h3>
        <div className="mono text-mute mb-3">used in shop · profile inventory · guild customization · rewards preview</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {[
            ['Torch', 'common', <Torch scale={2} />],
            ['Rug', 'uncommon', <Rug scale={2} w={14} />],
            ['Banner', 'rare', <Banner scale={2} color="#3d6149" />],
            ['Fireplace', 'epic', <Fireplace scale={2} />],
            ['Trophy', 'legendary', <Trophy scale={3} tier="gold" />],
          ].map(([name, r, icon], i) => (
            <div key={i} className={`item-card rarity-border--${r}`}>
              <div className="item-card__art">{icon}</div>
              <div style={{ fontFamily: 'Pixelify Sans', fontSize: 12, marginTop: 4 }}>{name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`rarity rarity--${r}`}>{r}</span>
                <span className="coin"><span className="coin-icon" />{[90, 180, 320, 720, 1480][i]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Motion */}
      <div className="panel mb-6">
        <h3>Motion language</h3>
        <div className="mono text-mute mb-3">4 primitives: idle-bob · flicker · firefly · rain overlay</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <div style={{ padding: 20, border: '3px solid var(--ink-0)', background: 'var(--parch-2)', textAlign: 'center' }}>
            <Hero scale={3} />
            <div className="mono text-mute small mt-2">idle-bob 2.4s</div>
          </div>
          <div style={{ padding: 20, border: '3px solid var(--ink-0)', background: 'var(--ink-0)', textAlign: 'center', minHeight: 120, position: 'relative' }}>
            <Torch scale={3} />
            <div className="mono small mt-2" style={{ color: 'var(--parch-2)' }}>flicker 0.6s</div>
          </div>
          <div style={{ padding: 20, border: '3px solid var(--ink-0)', background: 'var(--moss-0)', minHeight: 120, position: 'relative', overflow: 'hidden' }}>
            <Fireflies count={8} />
            <div className="mono small" style={{ color: 'var(--parch-2)', position: 'absolute', bottom: 10, left: 10 }}>fireflies 5s drift</div>
          </div>
          <div style={{ padding: 20, border: '3px solid var(--ink-0)', background: '#3a4a5a', minHeight: 120, position: 'relative', overflow: 'hidden' }}>
            <div className="rain" />
            <div className="mono small" style={{ color: 'var(--parch-2)', position: 'absolute', bottom: 10, left: 10 }}>rain overlay</div>
          </div>
        </div>
      </div>

      {/* Principles */}
      <div className="panel panel--dark">
        <h3 style={{ color: 'var(--parch-0)' }}>Design principles</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 10 }}>
          {[
            ['One material at a time', 'Каждая панель — один материал (parch / wood / dark). Не смешиваем в пределах одного блока.'],
            ['Ink is law', 'Все контуры — 3–4px var(--ink-0). Скругления запрещены. Тени — офсет, а не blur.'],
            ['Rarity is a border, not a fill', 'Редкость предметов показывается только рамкой, не заливкой фона. Сохраняем читаемость.'],
            ['Motion serves atmosphere', 'Анимация — живой мир (огонь, светлячки, дождь), не декоративное мерцание UI.'],
          ].map(([t, d], i) => (
            <div key={i} style={{ padding: 14, background: 'rgba(246,234,208,0.06)', border: '2px solid rgba(246,234,208,0.15)' }}>
              <div style={{ fontFamily: 'Pixelify Sans', fontSize: 16, color: 'var(--ember-3)' }}>{t}</div>
              <div className="text-light" style={{ opacity: 0.8, marginTop: 6 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DSScreen });
