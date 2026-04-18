/* ============================================================
   druz9 — Sprint 2: Training, Interview, Duel-live, Onboarding
   ============================================================ */

/* ---------- Training / Workshop — skill tree ---------- */
function TrainingScreen() {
  const [selected, setSelected] = React.useState('graph-dfs');

  // Nodes positioned on an 1100 × 760 logical canvas
  const nodes = [
    // Foundations cluster (bottom center)
    { id: 'arrays',      x: 540, y: 700, label: 'arrays\n& loops', state: 'unlocked', branch: 'core' },
    { id: 'strings',     x: 420, y: 640, label: 'strings', state: 'unlocked', branch: 'core' },
    { id: 'hashmap',     x: 660, y: 640, label: 'hash\nmap', state: 'unlocked', branch: 'core' },
    { id: 'sorting',     x: 300, y: 580, label: 'sorting', state: 'unlocked', branch: 'core' },
    { id: 'two-ptr',     x: 540, y: 580, label: '2-ptr', state: 'unlocked', branch: 'core' },
    { id: 'sliding',     x: 780, y: 580, label: 'sliding\nwindow', state: 'unlocked', branch: 'core' },

    // Trees branch (left)
    { id: 'tree-basics', x: 200, y: 480, label: 'trees\nbasics', state: 'unlocked', branch: 'tree' },
    { id: 'bst',         x: 120, y: 400, label: 'BST', state: 'unlocked', branch: 'tree' },
    { id: 'heap',        x: 240, y: 380, label: 'heap', state: 'unlocked', branch: 'tree' },
    { id: 'tree-dp',     x: 160, y: 290, label: 'tree\nDP', state: 'locked', branch: 'tree' },
    { id: 'segment',     x: 60,  y: 300, label: 'segment\ntree', state: 'locked', branch: 'tree', keystone: true },
    { id: 'lca',         x: 280, y: 260, label: 'LCA', state: 'locked', branch: 'tree' },

    // Graphs branch (center)
    { id: 'graph-basics',x: 460, y: 480, label: 'graph\nbasics', state: 'unlocked', branch: 'graph' },
    { id: 'graph-bfs',   x: 380, y: 400, label: 'BFS', state: 'unlocked', branch: 'graph' },
    { id: 'graph-dfs',   x: 540, y: 400, label: 'DFS', state: 'current', branch: 'graph' },
    { id: 'dijkstra',    x: 460, y: 300, label: 'dijkstra', state: 'locked', branch: 'graph' },
    { id: 'flow',        x: 540, y: 200, label: 'max\nflow', state: 'locked', branch: 'graph', keystone: true },
    { id: 'union-find',  x: 620, y: 320, label: 'union\nfind', state: 'locked', branch: 'graph' },

    // DP branch (right)
    { id: 'dp-basics',   x: 740, y: 480, label: 'DP\nbasics', state: 'unlocked', branch: 'dp' },
    { id: 'knapsack',    x: 860, y: 420, label: 'knapsack', state: 'locked', branch: 'dp' },
    { id: 'dp-strings',  x: 700, y: 400, label: 'DP\nstrings', state: 'locked', branch: 'dp' },
    { id: 'bitmask',     x: 960, y: 360, label: 'bitmask\nDP', state: 'locked', branch: 'dp', keystone: true },
    { id: 'digit-dp',    x: 840, y: 300, label: 'digit\nDP', state: 'locked', branch: 'dp' },

    // System design apex
    { id: 'systems',     x: 540, y: 90,  label: 'systems\ndesign', state: 'locked', branch: 'meta', keystone: true },
    { id: 'concurrency', x: 400, y: 140, label: 'concurr-\nency', state: 'locked', branch: 'meta' },
    { id: 'distributed', x: 680, y: 140, label: 'distri-\nbuted', state: 'locked', branch: 'meta' },
  ];

  const edges = [
    // core
    ['arrays', 'strings'], ['arrays', 'hashmap'], ['arrays', 'two-ptr'],
    ['strings', 'sorting'], ['strings', 'two-ptr'],
    ['hashmap', 'sliding'], ['two-ptr', 'sliding'],
    // trees
    ['sorting', 'tree-basics'], ['tree-basics', 'bst'], ['tree-basics', 'heap'],
    ['bst', 'segment'], ['bst', 'tree-dp'], ['heap', 'lca'],
    // graphs
    ['two-ptr', 'graph-basics'], ['graph-basics', 'graph-bfs'], ['graph-basics', 'graph-dfs'],
    ['graph-bfs', 'dijkstra'], ['graph-dfs', 'dijkstra'], ['graph-dfs', 'union-find'],
    ['dijkstra', 'flow'],
    // dp
    ['sliding', 'dp-basics'], ['dp-basics', 'knapsack'], ['dp-basics', 'dp-strings'],
    ['knapsack', 'bitmask'], ['dp-strings', 'digit-dp'],
    // apex
    ['flow', 'systems'], ['flow', 'concurrency'], ['knapsack', 'distributed'],
    ['systems', 'concurrency'], ['systems', 'distributed'],
  ];

  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
  const sel = byId[selected] || byId['graph-dfs'];

  const moduleDetails = {
    'graph-dfs': {
      title: 'Graphs · Depth-first search',
      desc: 'DFS, топологическая сортировка, поиск циклов, компоненты связности. 12 задач, 3 мини-проекта.',
      tasks: 12, projects: 3, hours: '6–8h', rewards: ['+320 ✦', '+60 gold', 'Graph Walker badge'],
      prereq: ['graph-basics'],
      unlocks: ['dijkstra', 'union-find'],
    },
  };
  const detail = moduleDetails[sel.id] || {
    title: sel.label.replace('\n', ' ') + ' module',
    desc: sel.state === 'locked' ? 'Заблокировано. Пройди предыдущие модули, чтобы открыть.' : 'Серия задач и мини-проектов по теме.',
    tasks: 8 + (sel.id.length % 8), projects: 2, hours: '4–6h',
    rewards: ['+200 ✦', '+40 gold'],
    prereq: [],
    unlocks: [],
  };

  const stroke = (s) => s === 'unlocked' ? '#3d6149' : s === 'current' ? '#b8692a' : '#5a4a38';

  return (
    <div>
      <PageHeader
        eyebrow="WORKSHOP · training grounds"
        title="The Artisan's Skill Tree"
        subtitle="Каждая ветка — это путь мастерства. Пройденные модули светятся мхом, текущий — углём. Keystone-узлы разблокируют системные темы."
        right={
          <div style={{ display: 'flex', gap: 8, whiteSpace: 'nowrap' }}>
            <button className="btn btn--sm" style={{ whiteSpace: 'nowrap' }}>my progress</button>
            <button className="btn btn--primary btn--sm" style={{ whiteSpace: 'nowrap' }}>continue graph-dfs</button>
          </div>
        }
      />

      {/* Branch stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 14 }}>
        {[
          ['Core', 6, 6, 'var(--moss-1)'],
          ['Trees', 3, 6, 'var(--moss-2)'],
          ['Graphs', 3, 6, 'var(--ember-1)'],
          ['DP', 1, 5, 'var(--parch-3)'],
          ['Systems', 0, 3, 'var(--ink-2)'],
        ].map(([name, done, total, c]) => (
          <div key={name} className="panel panel--tight" style={{ padding: 10 }}>
            <div className="row items-center justify-between mb-2">
              <span style={{ fontFamily: 'Pixelify Sans', fontSize: 14 }}>{name}</span>
              <span className="mono">{done}/{total}</span>
            </div>
            <div className="bar"><div style={{ width: `${(done/total)*100}%`, height: '100%', background: c }} /></div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 18 }}>
        {/* Skill canvas */}
        <div className="skill-canvas">
          {/* edges via SVG */}
          <svg viewBox="0 0 1100 760" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: 1100, height: 760 }}>
            {edges.map(([a, b], i) => {
              const na = byId[a], nb = byId[b];
              if (!na || !nb) return null;
              const unlocked = na.state === 'unlocked' && (nb.state === 'unlocked' || nb.state === 'current');
              return (
                <line
                  key={i}
                  x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                  stroke={unlocked ? '#b8692a' : '#4a3a2c'}
                  strokeWidth={unlocked ? 3 : 2}
                  strokeDasharray={unlocked ? '' : '4 4'}
                />
              );
            })}
          </svg>

          {nodes.map(n => (
            <div
              key={n.id}
              className={`skill-node skill-node--${n.state} ${n.keystone ? 'skill-node--keystone' : ''}`}
              style={{ left: n.x - (n.keystone ? 39 : 28), top: n.y - (n.keystone ? 39 : 28), outline: selected === n.id ? '3px solid #e9b866' : 'none', outlineOffset: 3 }}
              onClick={() => setSelected(n.id)}
            >
              {n.label.split('\n').map((l, i) => <div key={i}>{l}</div>)}
            </div>
          ))}

          {/* legend */}
          <div style={{ position: 'absolute', left: 16, bottom: 16, display: 'flex', gap: 10 }}>
            {[
              ['current', 'var(--ember-1)', 'currently learning'],
              ['unlocked', 'var(--moss-1)', 'mastered'],
              ['locked', '#3a3028', 'locked'],
            ].map(([k, c, t]) => (
              <div key={k} className="stat-chip" style={{ background: 'rgba(0,0,0,0.5)', borderColor: c }}>
                <span style={{ width: 10, height: 10, background: c, border: '2px solid var(--ink-0)' }} />
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Right — module detail */}
        <div className="panel" style={{ alignSelf: 'start', position: 'sticky', top: 158 }}>
          <div className="mono text-mute" style={{ fontSize: 9 }}>module</div>
          <h3 style={{ whiteSpace: 'normal' }}>{detail.title}</h3>
          <div className="row gap-2 mb-3" style={{ flexWrap: 'wrap' }}>
            <span className={`badge ${sel.state === 'unlocked' ? 'badge--moss' : sel.state === 'current' ? 'badge--ember' : ''}`}>
              {sel.state}
            </span>
            {sel.keystone && <span className="badge badge--dark">keystone</span>}
          </div>
          <div className="text-mute mb-3">{detail.desc}</div>

          <div className="divider" />
          <div className="row gap-4 mb-3">
            <div>
              <div className="mono text-mute" style={{ fontSize: 9 }}>tasks</div>
              <div style={{ fontFamily: 'Pixelify Sans', fontSize: 18 }}>{detail.tasks}</div>
            </div>
            <div>
              <div className="mono text-mute" style={{ fontSize: 9 }}>projects</div>
              <div style={{ fontFamily: 'Pixelify Sans', fontSize: 18 }}>{detail.projects}</div>
            </div>
            <div>
              <div className="mono text-mute" style={{ fontSize: 9 }}>est time</div>
              <div style={{ fontFamily: 'Pixelify Sans', fontSize: 18 }}>{detail.hours}</div>
            </div>
          </div>

          <div className="mono text-mute mb-2" style={{ fontSize: 9 }}>rewards</div>
          <div className="row gap-2 mb-3" style={{ flexWrap: 'wrap' }}>
            {detail.rewards.map((r, i) => <span key={i} className="badge badge--ember">{r}</span>)}
          </div>

          {sel.id === 'graph-dfs' && (
            <>
              <div className="divider" />
              <div className="mono text-mute mb-2" style={{ fontSize: 9 }}>progress</div>
              <div className="bar mb-2"><div className="bar__fill" style={{ width: '42%' }} /></div>
              <div className="mono text-mute" style={{ fontSize: 9 }}>5 / 12 tasks solved · 2 / 3 projects</div>
              <button className="btn btn--primary" style={{ width: '100%', marginTop: 12 }}
                onClick={() => window.__druz9_nav && window.__druz9_nav('training-task')}>
                resume task #6
              </button>
            </>
          )}
          {sel.state === 'locked' && (
            <button className="btn btn--ghost" style={{ width: '100%', marginTop: 12 }} disabled>requires prior nodes</button>
          )}
          {sel.state === 'unlocked' && sel.id !== 'graph-dfs' && (
            <button className="btn" style={{ width: '100%', marginTop: 12 }}>review · practice again</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- AI Interview / Mentor Tower ---------- */
function InterviewScreen() {
  return (
    <div>
      <PageHeader
        eyebrow="MENTOR TOWER · academy"
        title="Chamber of the Mentor"
        subtitle="AI-mock интервью по разным специализациям. Начни сессию — получишь отчёт, медаль и рекомендации."
        right={<button className="btn btn--primary btn--sm"
          onClick={() => window.__druz9_nav && window.__druz9_nav('interview-live')}>
          start new session
        </button>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18, marginBottom: 18 }}>
        {/* Readiness */}
        <div className="panel panel--dark">
          <h3 style={{ color: 'var(--parch-0)' }}>Readiness</h3>
          <div className="mono text-light mb-3" style={{ opacity: 0.7 }}>average over last 5 sessions</div>
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <svg viewBox="0 0 120 120" style={{ width: 180, height: 180 }}>
              <circle cx="60" cy="60" r="50" fill="none" stroke="#3a3028" strokeWidth="10" />
              <circle cx="60" cy="60" r="50" fill="none" stroke="#e9b866" strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 50}`}
                strokeDashoffset={`${2 * Math.PI * 50 * (1 - 0.78)}`}
                transform="rotate(-90 60 60)"
                strokeLinecap="butt"
              />
              <text x="60" y="62" textAnchor="middle" fontFamily="Pixelify Sans" fontSize="28" fill="#f6ead0">78%</text>
              <text x="60" y="78" textAnchor="middle" fontFamily="Silkscreen" fontSize="8" fill="#dcc690">READY</text>
            </svg>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[['algorithms', 82], ['system-design', 64], ['communication', 88], ['behavioral', 74]].map(([k, v]) => (
              <div key={k} style={{ padding: 8, background: 'rgba(246,234,208,0.06)', border: '2px solid rgba(246,234,208,0.15)' }}>
                <div className="mono text-light" style={{ opacity: 0.7, fontSize: 9 }}>{k}</div>
                <div style={{ fontFamily: 'Pixelify Sans', fontSize: 20, color: 'var(--ember-3)' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Mentors */}
        <div className="panel" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <h3>Choose a mentor</h3>
            <span className="mono text-mute">5 specializations</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { t: 'Senior Algorithms', d: '45 min · hard · trees/graphs', medal: 'gold', hot: true, pose: 'trophy', color: '#b8692a' },
              { t: 'System Design', d: '60 min · hard · distributed', medal: 'silver', pose: 'idle', color: '#3d6149' },
              { t: 'Frontend', d: '45 min · medium · React/CSS', medal: 'bronze', pose: 'wave', color: '#7a3d12' },
              { t: 'Backend', d: '45 min · medium · APIs/db', medal: 'silver', pose: 'idle', color: '#3b6a8f' },
              { t: 'Behavioral', d: '30 min · soft skills', medal: 'bronze', pose: 'wave', color: '#7a4a8f' },
              { t: 'Mock On-site', d: '3h · 4 rounds · elite', medal: 'gold', pose: 'trophy', color: '#7a3d12', elite: true },
            ].map((m, i) => (
              <div key={i} style={{
                padding: 12, border: '3px solid var(--ink-0)', background: 'var(--parch-0)',
                position: 'relative', display: 'flex', flexDirection: 'column', gap: 6,
                boxShadow: m.hot ? '3px 3px 0 var(--ember-1)' : 'none',
              }}>
                <div style={{ height: 60, background: m.color, border: '2px solid var(--ink-0)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' }}>
                  <Hero scale={2} pose={m.pose} />
                </div>
                <div style={{ fontFamily: 'Pixelify Sans', fontSize: 14 }}>{m.t}</div>
                <div className="mono text-mute" style={{ fontSize: 9 }}>{m.d}</div>
                <div className="row items-center justify-between">
                  <Trophy scale={2} tier={m.medal} />
                  <button className="btn btn--sm"
                    onClick={() => window.__druz9_nav && window.__druz9_nav('interview-live')}>
                    begin
                  </button>
                </div>
                {m.elite && <span className="badge badge--ember" style={{ position: 'absolute', top: 6, right: 6, fontSize: 9 }}>elite</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Past sessions + recommendations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 18 }}>
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <h3>Past sessions</h3>
            <span className="mono text-mute">42 total</span>
          </div>
          {[
            { t: 'yesterday · 19:40', spec: 'System Design', score: 78, meta: 'Designed URL shortener · feedback: clarify consistency model', medal: 'silver' },
            { t: '2 days ago', spec: 'Algorithms', score: 88, meta: 'Graphs · BFS · DFS · solved 3/3 in 42 min', medal: 'gold' },
            { t: '4 days ago', spec: 'Frontend', score: 71, meta: 'React state management · hook dependencies', medal: 'silver' },
            { t: '1 week ago', spec: 'Behavioral', score: 62, meta: 'STAR format · practice concrete outcomes', medal: 'bronze' },
          ].map((s, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '32px 1fr 60px 80px',
              alignItems: 'center', gap: 12,
              padding: '12px 0', borderBottom: i < 3 ? '1px dashed var(--ink-3)' : 'none',
            }}>
              <Trophy scale={2} tier={s.medal} />
              <div>
                <div style={{ fontFamily: 'Pixelify Sans', fontSize: 14 }}>{s.spec}</div>
                <div className="mono text-mute" style={{ fontSize: 9 }}>{s.t}</div>
                <div className="text-mute" style={{ fontSize: 11, marginTop: 2 }}>{s.meta}</div>
              </div>
              <div style={{ textAlign: 'right', fontFamily: 'Pixelify Sans', fontSize: 22, color: 'var(--ember-1)' }}>{s.score}</div>
              <button className="btn btn--sm">replay</button>
            </div>
          ))}
        </div>

        <div className="panel panel--wood">
          <h3 style={{ color: 'var(--parch-0)' }}>Mentor suggests</h3>
          <div className="mono" style={{ color: 'var(--parch-2)', marginBottom: 12 }}>based on recent gaps</div>
          {[
            ['Drill: consistency models', 'spotted weak in system design', '+120 ✦'],
            ['Graph-DFS module', '50% left in training', '+320 ✦'],
            ['Behavioral STAR library', 'unlock next medal', '+80 ✦'],
          ].map(([t, r, rw], i) => (
            <div key={i} style={{
              padding: 10, marginBottom: 8,
              background: 'var(--parch-0)', border: '2px solid var(--ink-0)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Pixelify Sans', fontSize: 13 }}>{t}</div>
                <div className="mono text-mute" style={{ fontSize: 9 }}>{r}</div>
              </div>
              <span className="mono text-ember">{rw}</span>
            </div>
          ))}
          <button className="btn" style={{ width: '100%', marginTop: 8 }}>schedule a mock this week</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Duel in progress ---------- */
function DuelLiveScreen({ onExit }) {
  return (
    <div>
      {/* Match banner */}
      <div className="panel panel--dark" style={{ padding: 0, overflow: 'hidden', marginBottom: 14, position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.4,
          background: 'linear-gradient(180deg, rgba(184,41,42,0.3) 0%, transparent 100%)',
        }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 1fr', alignItems: 'center', padding: '14px 20px', position: 'relative' }}>
          {/* You */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Hero scale={3} pose="idle" />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: 'Pixelify Sans', fontSize: 22, color: 'var(--parch-0)' }}>thornmoss</span>
                <span className="mono" style={{ color: 'var(--ember-3)' }}>elo 1847</span>
              </div>
              <div className="mono" style={{ color: 'var(--parch-2)', fontSize: 10, marginBottom: 6 }}>mossveil · master</div>
              <div className="hp-bar"><div className="hp-bar__fill" style={{ width: '72%' }} /></div>
              <div className="row items-center justify-between" style={{ marginTop: 4 }}>
                <span className="mono" style={{ color: 'var(--parch-2)', fontSize: 10 }}>HP 72 · 2/3 tests passed</span>
                <span className="mono" style={{ color: 'var(--ember-3)', fontSize: 10 }}>+2 combo</span>
              </div>
            </div>
          </div>

          {/* Timer */}
          <div style={{ textAlign: 'center' }}>
            <div className="mono text-light" style={{ opacity: 0.7, fontSize: 9 }}>round 2 / 3 · medium</div>
            <div style={{ fontFamily: 'Pixelify Sans', fontSize: 52, color: 'var(--ember-3)', lineHeight: 1 }}>04:12</div>
            <div className="row gap-2 center" style={{ marginTop: 4 }}>
              <span className="badge badge--ember">graphs</span>
              <span className="badge badge--dark">hard-bonus</span>
            </div>
          </div>

          {/* Foe */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexDirection: 'row-reverse', textAlign: 'right' }}>
            <div style={{
              transform: 'scaleX(-1)',
              filter: 'hue-rotate(-60deg) saturate(1.2)',
            }}>
              <Hero scale={3} pose="idle" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'flex-end' }}>
                <span className="mono" style={{ color: 'var(--ember-3)' }}>elo 1868</span>
                <span style={{ fontFamily: 'Pixelify Sans', fontSize: 22, color: 'var(--parch-0)' }}>glowbeacon</span>
              </div>
              <div className="mono" style={{ color: 'var(--parch-2)', fontSize: 10, marginBottom: 6 }}>red ravens · master</div>
              <div className="hp-bar"><div className="hp-bar__fill hp-bar__fill--foe" style={{ width: '58%' }} /></div>
              <div className="row items-center justify-between" style={{ marginTop: 4 }}>
                <span className="mono" style={{ color: 'var(--ember-3)', fontSize: 10 }}>compiling...</span>
                <span className="mono" style={{ color: 'var(--parch-2)', fontSize: 10 }}>HP 58 · 1/3 tests</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 280px', gap: 14 }}>
        {/* Problem */}
        <div className="panel" style={{ fontSize: 12 }}>
          <div className="mono text-mute" style={{ fontSize: 9 }}>problem · round 2</div>
          <h3 style={{ whiteSpace: 'normal', marginTop: 4 }}>Dungeon Paths</h3>
          <div className="text-mute mb-3" style={{ fontSize: 12 }}>
            Дан орграф из N пещер, где некоторые пары соединены туннелями. Найди количество различных кратчайших путей из пещеры 0 в пещеру N−1.
          </div>
          <div className="panel panel--recessed panel--tight" style={{ fontSize: 11, padding: 10 }}>
            <div className="mono text-mute" style={{ fontSize: 9, marginBottom: 4 }}>example</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              N = 5<br/>
              edges = [[0,1],[0,2],[1,3],[2,3],[3,4]]<br/>
              → 2
            </div>
          </div>
          <div className="row gap-2 mt-3" style={{ flexWrap: 'wrap' }}>
            <span className="badge">BFS</span>
            <span className="badge">modular</span>
            <span className="badge badge--ember">+40 elo on 1st solve</span>
          </div>
          <div className="divider" />
          <div className="mono text-mute mb-2" style={{ fontSize: 9 }}>test cases</div>
          {[
            ['sample 1', 'passed', 'moss'],
            ['sample 2', 'passed', 'moss'],
            ['hidden · small', 'running...', 'ember'],
            ['hidden · large', 'pending', ''],
          ].map(([n, s, c], i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: i < 3 ? '1px dashed var(--ink-3)' : 'none' }}>
              <span className="mono" style={{ fontSize: 10 }}>{n}</span>
              <span className={`mono ${c === 'moss' ? 'text-moss' : c === 'ember' ? 'text-ember' : 'text-mute'}`} style={{ fontSize: 10 }}>{s}</span>
            </div>
          ))}
        </div>

        {/* Code editor */}
        <div className="code-panel">
          <div className="row items-center justify-between mb-2" style={{ color: 'var(--parch-2)' }}>
            <span className="mono" style={{ fontSize: 10 }}>solution.py · python 3.11</span>
            <div className="row gap-2">
              <span className="mono" style={{ fontSize: 10, color: 'var(--moss-2)' }}>● saved</span>
              <span className="mono" style={{ fontSize: 10 }}>ln 24, col 8</span>
            </div>
          </div>
          <pre style={{ margin: 0, fontFamily: 'inherit', whiteSpace: 'pre-wrap' }}>
<span className="cm"># BFS from source, count shortest paths</span>{"\n"}
<span className="kw">from</span> collections <span className="kw">import</span> defaultdict, deque{"\n"}
{"\n"}
<span className="kw">def</span> <span className="fn">count_paths</span>(n, edges):{"\n"}
{"    "}g = defaultdict(<span className="fn">list</span>){"\n"}
{"    "}<span className="kw">for</span> a, b <span className="kw">in</span> edges:{"\n"}
{"        "}g[a].append(b){"\n"}
{"\n"}
{"    "}dist = [<span className="kw">float</span>(<span className="str">'inf'</span>)] * n{"\n"}
{"    "}ways = [<span className="num">0</span>] * n{"\n"}
{"    "}dist[<span className="num">0</span>] = <span className="num">0</span>{"\n"}
{"    "}ways[<span className="num">0</span>] = <span className="num">1</span>{"\n"}
{"    "}q = deque([<span className="num">0</span>]){"\n"}
{"\n"}
{"    "}<span className="kw">while</span> q:{"\n"}
{"        "}u = q.popleft(){"\n"}
{"        "}<span className="kw">for</span> v <span className="kw">in</span> g[u]:{"\n"}
{"            "}<span className="kw">if</span> dist[v] &gt; dist[u] + <span className="num">1</span>:{"\n"}
{"                "}dist[v] = dist[u] + <span className="num">1</span>{"\n"}
{"                "}ways[v] = ways[u]{"\n"}
{"                "}q.append(v){"\n"}
{"            "}<span className="kw">elif</span> dist[v] == dist[u] + <span className="num">1</span>:{"\n"}
{"                "}ways[v] += ways[u]{"\n"}
{"    "}<span className="kw">return</span> ways[n - <span className="num">1</span>]{"\n"}
{"\n"}
<span className="cm"># TODO: mod 10^9+7 for hidden large case_</span>
          </pre>
          <div className="row gap-2 mt-3">
            <button className="btn btn--primary btn--sm">submit ⏎</button>
            <button className="btn btn--sm">run sample</button>
            <div style={{ flex: 1 }} />
            <button className="btn btn--ghost btn--sm" onClick={onExit}>forfeit</button>
          </div>
        </div>

        {/* Side: taunts + spectators + buffs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="panel panel--tight" style={{ padding: 12 }}>
            <div className="mono text-mute mb-2" style={{ fontSize: 9 }}>banter · duel chat</div>
            <div style={{ fontSize: 11, lineHeight: 1.5 }}>
              <div><span className="mono text-ember">glowbeacon:</span> nice edge case</div>
              <div><span className="mono text-moss">thornmoss:</span> mod coming 🔥</div>
              <div><span className="mono text-ember">glowbeacon:</span> gl hf</div>
              <div className="text-mute" style={{ fontSize: 10, fontStyle: 'italic', marginTop: 4 }}>— preset taunts only —</div>
            </div>
            <div className="row gap-2 mt-2" style={{ flexWrap: 'wrap' }}>
              {['gg', 'close one', '🔥', 'so close'].map(t => (
                <span key={t} className="tweak-chip">{t}</span>
              ))}
            </div>
          </div>

          <div className="panel panel--tight" style={{ padding: 12 }}>
            <div className="mono text-mute mb-2" style={{ fontSize: 9 }}>buffs active</div>
            {[
              ['Moonveil aura', '+5% xp', 'epic'],
              ['Ember streak', '+10% elo', 'rare'],
              ['Guild morale', '+3 HP/min', 'uncommon'],
            ].map(([n, e, r], i) => (
              <div key={i} style={{ padding: 6, border: '2px solid var(--ink-0)', background: 'var(--parch-0)', marginBottom: 4, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ fontFamily: 'Pixelify Sans', fontSize: 11 }}>{n}</span>
                <span className="mono text-ember" style={{ fontSize: 9 }}>{e}</span>
              </div>
            ))}
          </div>

          <div className="panel panel--tight" style={{ padding: 12 }}>
            <div className="row items-center justify-between mb-2">
              <div className="mono text-mute" style={{ fontSize: 9 }}>spectators · 47</div>
              <span className="mono text-ember" style={{ fontSize: 9 }}>12 from mossveil</span>
            </div>
            <div className="row gap-1" style={{ flexWrap: 'wrap' }}>
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} style={{
                  width: 18, height: 18,
                  background: ['var(--moss-1)', 'var(--ember-1)', 'var(--r-epic)', 'var(--r-rare)'][i % 4],
                  border: '2px solid var(--ink-0)',
                }} />
              ))}
              <div className="mono" style={{ fontSize: 9, padding: '2px 4px' }}>+29</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Onboarding flow ---------- */
function OnboardingModal({ onClose }) {
  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState('Wanderer');
  const [guildChoice, setGuildChoice] = React.useState('mossveil');
  const [companion, setCompanion] = React.useState('slime');

  const steps = [
    {
      title: 'Welcome, traveler',
      eyebrow: 'STEP 1 / 5 · awakening',
      body: (
        <>
          <div className="panel panel--recessed" style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, #3d6149 0%, #2d4a35 100%)' }}>
            <Hero scale={5} pose="wave" />
            <Fireflies count={10} />
          </div>
          <p className="mt-3">druz9 — это не просто платформа для практики. Это мир, где каждая решённая задача, каждая дуэль и каждое интервью — след в твоей истории.</p>
          <p className="text-mute small mt-2">Путь займёт 2 минуты.</p>
        </>
      ),
    },
    {
      title: 'Choose your name',
      eyebrow: 'STEP 2 / 5 · signing the registry',
      body: (
        <>
          <div className="mono text-mute mb-2" style={{ fontSize: 9 }}>adventurer name</div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px',
              fontFamily: 'Pixelify Sans', fontSize: 18,
              background: 'var(--parch-0)', border: '3px solid var(--ink-0)',
              color: 'var(--ink-0)',
              boxShadow: 'inset 2px 2px 0 var(--parch-3), inset -2px -2px 0 var(--parch-2)',
            }}
          />
          <div className="mono text-mute small mt-2">3–20 символов · видно всем участникам мира</div>
        </>
      ),
    },
    {
      title: 'Pick your path',
      eyebrow: 'STEP 3 / 5 · your calling',
      body: (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            ['algorithms', 'Algorithmist', 'алгоритмы · дуэли · сложные задачи'],
            ['systems', 'Architect', 'system design · distributed · API'],
            ['frontend', 'Weaver', 'React · CSS · продуктовый интерфейс'],
          ].map(([id, t, d]) => (
            <div key={id} style={{
              padding: 14, border: '3px solid var(--ink-0)', background: 'var(--parch-0)',
              boxShadow: '3px 3px 0 var(--ink-0)', cursor: 'pointer',
            }}>
              <div style={{ height: 60, background: 'var(--ink-0)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                {id === 'algorithms' && <Sword scale={2} />}
                {id === 'systems' && <Statue scale={2} color="#dcc690" />}
                {id === 'frontend' && <Banner scale={2} color="#3d6149" />}
              </div>
              <div style={{ fontFamily: 'Pixelify Sans', fontSize: 14 }}>{t}</div>
              <div className="mono text-mute" style={{ fontSize: 9 }}>{d}</div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Choose a starting guild',
      eyebrow: 'STEP 4 / 5 · finding kin',
      body: (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { id: 'mossveil', name: 'Mossveil', t: 'cozy learners · rank 14 · 24 members', c: '#3d6149' },
            { id: 'red', name: 'Red Ravens', t: 'competitive · rank 12 · 31 members', c: '#a23a2a' },
            { id: 'solo', name: 'Fly solo', t: 'join a guild later', c: '#7a593a' },
            { id: 'create', name: 'Create new', t: 'start your own banner', c: '#5a3f27' },
          ].map(g => (
            <div key={g.id} onClick={() => setGuildChoice(g.id)} style={{
              padding: 12, border: '3px solid var(--ink-0)',
              background: guildChoice === g.id ? 'var(--parch-0)' : 'var(--parch-2)',
              boxShadow: guildChoice === g.id ? '3px 3px 0 var(--ember-1)' : '3px 3px 0 var(--ink-0)',
              cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center',
            }}>
              <Banner scale={2} color={g.c} />
              <div>
                <div style={{ fontFamily: 'Pixelify Sans', fontSize: 14 }}>{g.name}</div>
                <div className="mono text-mute" style={{ fontSize: 9 }}>{g.t}</div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Your first companion',
      eyebrow: 'STEP 5 / 5 · a gift',
      body: (
        <>
          <p className="text-mute mb-3">Выбери спутника. Его можно будет сменить в любой момент в магазине.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              ['slime', 'Moss Slime', <SlimePet scale={3} />],
              ['raven', 'Raven', <RavenPet scale={3} />],
              ['orb', 'Spirit Orb', <SpiritOrb scale={3} />],
            ].map(([id, n, icon]) => (
              <div key={id} onClick={() => setCompanion(id)} style={{
                padding: 14, border: '3px solid var(--ink-0)',
                background: companion === id ? 'var(--parch-0)' : 'var(--parch-2)',
                boxShadow: companion === id ? '3px 3px 0 var(--ember-1)' : '3px 3px 0 var(--ink-0)',
                cursor: 'pointer', textAlign: 'center',
              }}>
                <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
                <div style={{ fontFamily: 'Pixelify Sans', fontSize: 13 }}>{n}</div>
              </div>
            ))}
          </div>
        </>
      ),
    },
  ];

  const s = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="modal-backdrop">
      <div className="modal panel panel--nailed" style={{ padding: 28 }}>
        <div className="mono" style={{ color: 'var(--ember-1)' }}>{s.eyebrow}</div>
        <h2 style={{ whiteSpace: 'normal', margin: '6px 0 16px' }}>{s.title}</h2>
        {s.body}
        <div className="divider" />
        <div className="row items-center justify-between">
          <div className="row gap-2">
            {steps.map((_, i) => (
              <div key={i} style={{
                width: 22, height: 6,
                background: i <= step ? 'var(--ember-1)' : 'var(--parch-3)',
                border: '2px solid var(--ink-0)',
              }} />
            ))}
          </div>
          <div className="row gap-2">
            {step > 0 && <button className="btn btn--sm" onClick={() => setStep(step - 1)}>back</button>}
            {!isLast ? (
              <button className="btn btn--primary btn--sm" onClick={() => setStep(step + 1)}>next →</button>
            ) : (
              <button className="btn btn--primary btn--sm" onClick={onClose}>enter the world →</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TrainingScreen, InterviewScreen, DuelLiveScreen, OnboardingModal });
