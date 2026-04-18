/* ============================================================
   druz9 — New screens (Sprint 3): Workshop task solver,
   Mentor live session, Hub polish, empty/error states,
   Sound notes, Mobile view.
   ============================================================ */

/* ---------- Workshop Task Solver ---------- */
function TaskSolverScreen({ onExit, onSubmit }) {
  const [code, setCode] = React.useState(
`def dfs_order(n, edges):
    # Build adjacency list
    g = [[] for _ in range(n)]
    for a, b in edges:
        g[a].append(b)

    visited = [False] * n
    order = []

    def walk(u):
        visited[u] = True
        for v in g[u]:
            if not visited[v]:
                walk(v)
        order.append(u)

    for i in range(n):
        if not visited[i]:
            walk(i)
    return order[::-1]
`);

  const [running, setRunning] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [output, setOutput] = React.useState('> ready. press ▶ run to evaluate samples.');
  const [cases, setCases] = React.useState([
    { n: 'sample · triangle', input: 'n=3 edges=[[0,1],[1,2],[2,0]]', expected: '[2, 1, 0]', status: 'idle' },
    { n: 'sample · two trees', input: 'n=4 edges=[[0,1],[2,3]]', expected: '[1, 0, 3, 2]', status: 'idle' },
    { n: 'hidden · dense', input: '(2,000 nodes)', expected: '—', hidden: true, status: 'locked' },
    { n: 'hidden · sparse', input: '(50,000 nodes)', expected: '—', hidden: true, status: 'locked' },
    { n: 'hidden · edge case', input: '(single node)', expected: '—', hidden: true, status: 'locked' },
  ]);

  const runSamples = () => {
    if (running) return;
    setRunning(true);
    setOutput('> compiling...\n> running sample cases...');
    setCases(cs => cs.map(c => c.hidden ? c : { ...c, status: 'running' }));
    setTimeout(() => {
      setCases(cs => cs.map((c, i) => c.hidden ? c : { ...c, status: i === 0 ? 'pass' : 'pass' }));
      setOutput(t => t + '\n> sample 1: PASS (12ms · 2.4mb)\n> sample 2: PASS (8ms · 2.4mb)\n> all public samples green.');
      setRunning(false);
    }, 1200);
  };

  const doSubmit = () => {
    if (running) return;
    setRunning(true);
    setSubmitted(false);
    setOutput('> submitting...\n> compiling solution.py\n> running 5 test cases...');
    setCases(cs => cs.map(c => ({ ...c, status: 'running' })));
    setTimeout(() => {
      setCases(cs => cs.map((c, i) => ({
        ...c,
        status: i < 4 ? 'pass' : 'pass',
      })));
      setOutput(t => t + '\n> sample 1: PASS (12ms)\n> sample 2: PASS (8ms)\n> hidden · dense: PASS (142ms · 28mb)\n> hidden · sparse: PASS (89ms · 9mb)\n> hidden · edge case: PASS (2ms)\n> VERDICT: accepted · +320 XP · +60 gold · task #6 / 12 complete');
      setSubmitted(true);
      setRunning(false);
      if (onSubmit) onSubmit();
    }, 2200);
  };

  const solvedCount = 5;

  return (
    <div>
      <PageHeader
        eyebrow="WORKSHOP · TASK 6 / 12 · GRAPHS · DFS"
        title="Topological order of a DAG"
        subtitle="Верни вершины в порядке обратного пост-обхода. Циклов не будет — это гарантирует постановка."
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn--sm" onClick={onExit}>← back to tree</button>
            <button className="btn btn--sm">hint (−20 ✦)</button>
          </div>
        }
      />

      {/* breadcrumb bar */}
      <div className="panel panel--recessed panel--tight" style={{ padding: 10, marginBottom: 14 }}>
        <div className="row items-center gap-3" style={{ flexWrap: 'wrap' }}>
          <span className="mono text-mute" style={{ fontSize: 9 }}>module progress</span>
          <div style={{ display: 'flex', gap: 3, flex: 1 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 16,
                background: i < solvedCount ? 'var(--moss-1)' : i === solvedCount ? 'var(--ember-1)' : 'var(--parch-3)',
                border: '2px solid var(--ink-0)',
                color: 'var(--parch-0)',
                fontFamily: 'Silkscreen', fontSize: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{i + 1}</div>
            ))}
          </div>
          <span className="mono">{solvedCount} / 12</span>
          <span className="badge badge--ember">task #{solvedCount + 1}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr 300px', gap: 14 }}>
        {/* Problem brief */}
        <div className="panel" style={{ fontSize: 12 }}>
          <div className="mono text-mute" style={{ fontSize: 9 }}>problem</div>
          <h3 style={{ whiteSpace: 'normal', marginTop: 4 }}>Path of the scribe</h3>
          <div className="row gap-2 mb-3" style={{ flexWrap: 'wrap' }}>
            <span className="badge">medium</span>
            <span className="badge">graphs</span>
            <span className="badge">DFS</span>
            <span className="badge badge--ember">+320 ✦</span>
          </div>

          <div className="text-mute mb-3" style={{ fontSize: 12 }}>
            Старый писец составил список ссылок между трактатами — чтобы читать их по порядку, нужно топологически отсортировать граф. Реши задачу через DFS с пост-обходом.
          </div>

          <div className="mono text-mute" style={{ fontSize: 9, marginBottom: 4 }}>constraints</div>
          <div className="panel panel--recessed panel--tight" style={{ fontSize: 11, padding: 10, marginBottom: 10, fontFamily: 'JetBrains Mono, monospace' }}>
            1 ≤ n ≤ 50 000<br/>
            0 ≤ edges.length ≤ 2·n<br/>
            Граф ацикличен.<br/>
            Лимит: 1s · 32mb
          </div>

          <div className="mono text-mute" style={{ fontSize: 9, marginBottom: 4 }}>example</div>
          <div className="panel panel--recessed panel--tight" style={{ fontSize: 11, padding: 10, fontFamily: 'JetBrains Mono, monospace' }}>
            <span className="text-mute">input:</span><br/>
            n = 3<br/>
            edges = [[0,1],[1,2],[2,0]]<br/>
            <br/>
            <span className="text-mute">output:</span><br/>
            [2, 1, 0]
          </div>

          <div className="divider" />
          <div className="mono text-mute" style={{ fontSize: 9 }}>unlocks on accept</div>
          <div className="row gap-2 mt-2" style={{ flexWrap: 'wrap' }}>
            <span className="badge badge--moss">task #7</span>
            <span className="badge">graph walker +1</span>
          </div>
        </div>

        {/* Editor + output */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="code-panel" style={{ padding: 0 }}>
            <div className="row items-center justify-between" style={{ padding: '10px 14px', borderBottom: '2px solid #0e0906', color: 'var(--parch-2)' }}>
              <div className="row gap-2 items-center">
                <span className="mono" style={{ fontSize: 10 }}>solution.py</span>
                <select style={{
                  background: '#1a140e', color: 'var(--parch-2)', border: '2px solid var(--ink-0)',
                  fontFamily: 'Silkscreen', fontSize: 10, padding: '2px 6px',
                }}>
                  <option>python 3.11</option>
                  <option>typescript</option>
                  <option>go</option>
                  <option>c++</option>
                </select>
              </div>
              <div className="row gap-3 items-center">
                <span className="mono" style={{ fontSize: 10, color: 'var(--moss-2)' }}>● saved</span>
                <span className="mono" style={{ fontSize: 10 }}>ln {code.split('\n').length}, col 1</span>
                <span className="mono" style={{ fontSize: 10 }}>autosave 2s</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr', fontFamily: 'JetBrains Mono, monospace' }}>
              <div style={{
                padding: '12px 8px', textAlign: 'right',
                color: '#6a5a48', fontSize: 12, lineHeight: 1.5,
                borderRight: '1px solid #3a2a1a', userSelect: 'none',
              }}>
                {code.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
              </div>
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                spellCheck={false}
                style={{
                  background: 'transparent', color: 'var(--parch-0)',
                  border: 'none', outline: 'none',
                  fontFamily: 'inherit', fontSize: 13, lineHeight: 1.5,
                  padding: '12px 14px', resize: 'none',
                  minHeight: 340, width: '100%',
                }}
              />
            </div>
            <div style={{ padding: '8px 12px', borderTop: '2px solid #0e0906', display: 'flex', gap: 8 }}>
              <button className="btn btn--sm" onClick={runSamples} disabled={running}>▶ run samples</button>
              <button className="btn btn--primary btn--sm" onClick={doSubmit} disabled={running}>
                {running ? 'running...' : '⤴ submit'}
              </button>
              <div style={{ flex: 1 }} />
              <button className="btn btn--ghost btn--sm">format</button>
              <button className="btn btn--ghost btn--sm">reset</button>
            </div>
          </div>

          {/* Output console */}
          <div className="panel panel--dark" style={{ padding: 0 }}>
            <div className="row items-center justify-between" style={{ padding: '8px 12px', borderBottom: '2px solid #0e0906' }}>
              <span className="mono text-light" style={{ fontSize: 9, opacity: 0.7 }}>console</span>
              <div className="row gap-2">
                <span className="mono" style={{ fontSize: 9, color: running ? 'var(--ember-3)' : 'var(--moss-2)' }}>
                  {running ? '● running' : submitted ? '● accepted' : '● idle'}
                </span>
                <span className="mono text-light" style={{ fontSize: 9, opacity: 0.5 }}>/tmp/sandbox-8a2</span>
              </div>
            </div>
            <pre style={{
              margin: 0, padding: '12px 14px',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, lineHeight: 1.5,
              color: submitted ? 'var(--moss-2)' : 'var(--parch-2)',
              maxHeight: 130, overflow: 'auto',
              whiteSpace: 'pre-wrap',
            }}>{output}</pre>
          </div>
        </div>

        {/* Test cases + hints */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="panel panel--tight">
            <div className="mono text-mute mb-2" style={{ fontSize: 9 }}>test cases</div>
            {cases.map((c, i) => (
              <div key={i} style={{
                padding: 10, marginBottom: 6,
                background: c.status === 'pass' ? 'rgba(93,127,76,0.12)' : c.status === 'fail' ? 'rgba(162,58,42,0.12)' : 'var(--parch-0)',
                border: '2px solid var(--ink-0)',
                borderLeft: `6px solid ${
                  c.status === 'pass' ? 'var(--moss-1)' :
                  c.status === 'fail' ? 'var(--danger)' :
                  c.status === 'running' ? 'var(--ember-1)' :
                  c.hidden ? 'var(--ink-3)' : 'var(--parch-3)'
                }`,
              }}>
                <div className="row items-center justify-between">
                  <span style={{ fontFamily: 'Pixelify Sans', fontSize: 12 }}>
                    {c.hidden && '🔒 '}{c.n}
                  </span>
                  <span className={`mono ${
                    c.status === 'pass' ? 'text-moss' :
                    c.status === 'fail' ? 'text-mute' :
                    c.status === 'running' ? 'text-ember' : 'text-mute'
                  }`} style={{ fontSize: 9 }}>
                    {c.status === 'idle' ? (c.hidden ? 'hidden' : 'not run') :
                     c.status === 'running' ? '● running' :
                     c.status === 'pass' ? '✓ pass' :
                     c.status === 'fail' ? '✗ fail' : c.status}
                  </span>
                </div>
                {!c.hidden && (
                  <div className="mono text-mute" style={{ fontSize: 9, marginTop: 3, fontFamily: 'JetBrains Mono, monospace' }}>
                    {c.input}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="panel panel--tight" style={{ background: 'var(--parch-2)' }}>
            <div className="mono text-mute mb-2" style={{ fontSize: 9 }}>hints · progressive</div>
            {[
              ['free', 'Попробуй пост-обход DFS и разверни результат.', true],
              ['−20 ✦', 'Используй массив visited[] — и убедись, что обрабатываешь все компоненты.', false],
              ['−60 ✦', 'Полный псевдокод со всеми инвариантами.', false],
            ].map(([cost, text, open], i) => (
              <div key={i} style={{
                padding: 8, marginBottom: 4,
                background: 'var(--parch-0)', border: '2px solid var(--ink-0)',
                opacity: open ? 1 : 0.8,
              }}>
                <div className="row items-center justify-between mb-1">
                  <span className="mono" style={{ fontSize: 9 }}>hint {i + 1}</span>
                  <span className="mono text-ember" style={{ fontSize: 9 }}>{cost}</span>
                </div>
                {open ? (
                  <div style={{ fontSize: 11 }}>{text}</div>
                ) : (
                  <div className="text-mute" style={{ fontSize: 10, fontStyle: 'italic' }}>▸ reveal</div>
                )}
              </div>
            ))}
          </div>

          {submitted && (
            <div className="panel panel--wood" style={{ animation: 'pop-in 0.3s ease-out' }}>
              <div style={{ fontFamily: 'Pixelify Sans', fontSize: 18, color: 'var(--ember-3)', marginBottom: 4 }}>ACCEPTED</div>
              <div className="mono" style={{ color: 'var(--parch-2)', fontSize: 9, marginBottom: 8 }}>task #6 · graphs · dfs</div>
              <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
                <span className="badge badge--ember">+320 ✦</span>
                <span className="badge badge--moss">+60 gold</span>
                <span className="badge">graph walker 5/12</span>
              </div>
              <button className="btn btn--primary" style={{ width: '100%', marginTop: 10 }} onClick={onExit}>
                continue → task #7
              </button>
            </div>
          )}
        </div>
      </div>

      {/* sound notes */}
      <SoundAnnotation notes={[
        { at: '▶ run', sfx: 'soft-clack.wav', desc: 'Mechanical quill on parchment.' },
        { at: 'pass', sfx: 'ember-chime.wav', desc: 'Warm bell, +40 Hz per pass for chord build.' },
        { at: 'fail', sfx: 'book-thud.wav', desc: 'Dull thud, muffled. Never punitive.' },
        { at: 'accepted', sfx: 'trumpet-short.wav', desc: 'Guild fanfare, 1.2s.' },
      ]} />
    </div>
  );
}

/* ---------- Mentor Live Session ---------- */
function MentorLiveScreen({ onExit }) {
  const [messages, setMessages] = React.useState([
    { role: 'mentor', text: 'Здравствуй, Thornmoss. Сегодня разбираем систему укорачивателя ссылок. 45 минут, две роли — ты за интервьюера, я за твоего коуча в голове. Поехали?', at: '00:00' },
    { role: 'mentor', text: 'Начни с requirements. Какие вопросы ты бы задал продукту перед тем, как рисовать коробки?', at: '00:18' },
    { role: 'user', text: 'Сначала масштаб — сколько запросов на чтение и запись? Какие лимиты длины? Нужна ли аналитика и кастомные короткие коды?', at: '00:52' },
    { role: 'mentor', text: 'Хорошо. Держи в голове 100 писем/1000 чтений — асимметрия по чтению даст тебе кэш-слой позже. Теперь — схемы данных. Что храним?', at: '01:24' },
  ]);

  const [typing, setTyping] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [codeTab, setCodeTab] = React.useState('schema');
  const [timer, setTimer] = React.useState(42 * 60 + 15);
  const [phase, setPhase] = React.useState(2);
  const [micOn, setMicOn] = React.useState(true);

  React.useEffect(() => {
    const t = setInterval(() => setTimer(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(timer / 60)).padStart(2, '0');
  const ss = String(timer % 60).padStart(2, '0');

  const send = () => {
    if (!draft.trim()) return;
    const now = `${String(Math.floor((45 * 60 - timer) / 60)).padStart(2, '0')}:${String((45 * 60 - timer) % 60).padStart(2, '0')}`;
    setMessages(m => [...m, { role: 'user', text: draft, at: now }]);
    setDraft('');
    setTyping(true);
    setTimeout(() => {
      setMessages(m => [...m, {
        role: 'mentor',
        text: 'Принято. Один уточняющий момент — ты продумал, что делать, если хэш даст коллизию? Это ловушка, по которой часто заваливают кандидатов.',
        at: now,
      }]);
      setTyping(false);
    }, 1800);
  };

  const phases = [
    'requirements', 'data model', 'api design', 'storage & scale', 'reliability', 'wrap-up',
  ];

  return (
    <div>
      <PageHeader
        eyebrow={`MENTOR TOWER · LIVE · SESSION #43 · SYSTEM DESIGN`}
        title="Chamber of the Mentor · in session"
        subtitle="Живой разбор с AI-ментором. Слева разговор, справа — твой эскиз дизайна. Прогресс сохраняется каждые 20 секунд."
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn btn--sm ${micOn ? 'btn--moss' : ''}`} onClick={() => setMicOn(!micOn)}>
              {micOn ? '🎙 mic on' : '🔇 muted'}
            </button>
            <button className="btn btn--sm">note (n)</button>
            <button className="btn btn--sm" onClick={onExit}>end session</button>
          </div>
        }
      />

      {/* top status bar */}
      <div className="panel panel--dark" style={{ padding: 14, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', alignItems: 'center', gap: 20 }}>
          {/* mentor card */}
          <div className="row items-center gap-3">
            <div style={{ width: 56, height: 56, background: '#3d6149', border: '3px solid var(--ink-0)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' }}>
              <Hero scale={2} pose="idle" />
              <div style={{ position: 'absolute' }} />
            </div>
            <div>
              <div style={{ fontFamily: 'Pixelify Sans', fontSize: 16, color: 'var(--parch-0)' }}>Mentor Velvaine</div>
              <div className="mono" style={{ color: 'var(--parch-2)', fontSize: 9 }}>senior · system design · ★ 4.92</div>
              <div className="mono" style={{ color: 'var(--moss-2)', fontSize: 9, marginTop: 2 }}>● speaking</div>
            </div>
          </div>

          {/* phase tracker */}
          <div>
            <div className="mono text-light mb-2" style={{ fontSize: 9, opacity: 0.7 }}>interview phase</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {phases.map((p, i) => (
                <div key={p} style={{ flex: 1 }}>
                  <div style={{
                    height: 10,
                    background: i < phase ? 'var(--moss-1)' : i === phase ? 'var(--ember-1)' : '#3a3028',
                    border: '2px solid var(--ink-0)',
                  }} />
                  <div className="mono" style={{ fontSize: 8, color: i === phase ? 'var(--ember-3)' : 'var(--parch-2)', marginTop: 3, textAlign: 'center', opacity: i === phase ? 1 : 0.6 }}>
                    {p}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* timer */}
          <div style={{ textAlign: 'right' }}>
            <div className="mono text-light" style={{ fontSize: 9, opacity: 0.7 }}>time remaining</div>
            <div style={{ fontFamily: 'Pixelify Sans', fontSize: 36, color: timer < 300 ? 'var(--danger)' : 'var(--ember-3)', lineHeight: 1 }}>
              {mm}:{ss}
            </div>
            <div className="mono text-light" style={{ fontSize: 9, opacity: 0.7 }}>of 45:00</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, minHeight: 520 }}>
        {/* Chat column */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
          <div className="row items-center justify-between" style={{ padding: '12px 16px', borderBottom: '2px dashed var(--ink-3)' }}>
            <h3 style={{ margin: 0 }}>Transcript</h3>
            <span className="mono text-mute">recording · auto-transcribe</span>
          </div>
          <div style={{ flex: 1, padding: 16, overflow: 'auto', maxHeight: 500 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10,
                flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
                marginBottom: 14,
              }}>
                <div style={{
                  width: 32, height: 32, flexShrink: 0,
                  background: m.role === 'user' ? 'var(--ember-1)' : 'var(--moss-1)',
                  border: '3px solid var(--ink-0)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Pixelify Sans', fontSize: 12, color: 'var(--parch-0)',
                }}>{m.role === 'user' ? 'T' : 'V'}</div>
                <div style={{ maxWidth: '78%' }}>
                  <div className="row gap-2 items-baseline mb-1" style={{ flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                    <span className="mono" style={{ fontSize: 9, color: m.role === 'user' ? 'var(--ember-1)' : 'var(--moss-1)' }}>
                      {m.role === 'user' ? 'you' : 'velvaine'}
                    </span>
                    <span className="mono text-mute" style={{ fontSize: 9 }}>{m.at}</span>
                  </div>
                  <div style={{
                    padding: '10px 12px',
                    background: m.role === 'user' ? 'var(--ember-2)' : 'var(--parch-0)',
                    border: '2px solid var(--ink-0)',
                    borderLeft: m.role === 'user' ? '2px solid var(--ink-0)' : '4px solid var(--moss-1)',
                    borderRight: m.role === 'user' ? '4px solid var(--ember-0)' : '2px solid var(--ink-0)',
                    fontSize: 12, lineHeight: 1.5,
                  }}>
                    {m.text}
                  </div>
                </div>
              </div>
            ))}
            {typing && (
              <div className="row gap-2 items-center" style={{ padding: '4px 42px' }}>
                <span className="mono text-moss" style={{ fontSize: 10 }}>velvaine is typing</span>
                <span className="mono text-mute" style={{ fontSize: 14, letterSpacing: 2 }}>···</span>
              </div>
            )}
          </div>

          {/* input */}
          <div style={{ padding: 12, borderTop: '2px solid var(--ink-0)', background: 'var(--parch-2)' }}>
            <div className="row gap-2 mb-2" style={{ flexWrap: 'wrap' }}>
              {['Ask for scale', 'Request trade-offs', 'Propose caching', 'I\'m stuck'].map(q => (
                <span key={q} className="tweak-chip" onClick={() => setDraft(d => d ? d + ' · ' + q : q)}>{q}</span>
              ))}
            </div>
            <div className="row gap-2">
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); }}
                placeholder="Reply to Velvaine… (⌘+Enter to send)"
                style={{
                  flex: 1, padding: 10,
                  background: 'var(--parch-0)', border: '3px solid var(--ink-0)',
                  boxShadow: 'inset 2px 2px 0 var(--parch-3)',
                  fontFamily: 'IBM Plex Sans', fontSize: 12,
                  color: 'var(--ink-0)', resize: 'vertical',
                  minHeight: 52, maxHeight: 120,
                }}
              />
              <button className="btn btn--primary" onClick={send}>send</button>
            </div>
          </div>
        </div>

        {/* Code + scratchpad column */}
        <div className="panel" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="tabs" style={{ margin: 0, borderBottom: 'none' }}>
            {['schema', 'api', 'diagram'].map(t => (
              <span
                key={t}
                className={`tab ${codeTab === t ? 'tab--active' : ''}`}
                onClick={() => setCodeTab(t)}
              >{t}</span>
            ))}
          </div>

          {codeTab === 'schema' && (
            <div className="code-panel" style={{ margin: 0, flex: 1, borderTop: 'none', boxShadow: 'none', fontSize: 12 }}>
              <div className="row items-center justify-between mb-2" style={{ color: 'var(--parch-2)' }}>
                <span className="mono" style={{ fontSize: 10 }}>data_model.sql · shared with mentor</span>
                <span className="mono text-moss" style={{ fontSize: 10 }}>● live</span>
              </div>
              <pre style={{ margin: 0, fontFamily: 'inherit', whiteSpace: 'pre-wrap' }}>
<span className="cm">-- urls: hot read path, 1000 rps</span>{"\n"}
<span className="kw">CREATE TABLE</span> urls ({"\n"}
  code      <span className="kw">VARCHAR</span>(<span className="num">8</span>) <span className="kw">PRIMARY KEY</span>,{"\n"}
  long_url  <span className="kw">TEXT NOT NULL</span>,{"\n"}
  owner_id  <span className="kw">BIGINT REFERENCES</span> users(id),{"\n"}
  expires_at <span className="kw">TIMESTAMPTZ</span>,{"\n"}
  created_at <span className="kw">TIMESTAMPTZ DEFAULT NOW</span>(){"\n"}
);{"\n"}
{"\n"}
<span className="cm">-- hits: write-heavy, 100 rps, batched to OLAP</span>{"\n"}
<span className="kw">CREATE TABLE</span> hits ({"\n"}
  code      <span className="kw">VARCHAR</span>(<span className="num">8</span>),{"\n"}
  at        <span className="kw">TIMESTAMPTZ</span>,{"\n"}
  referer   <span className="kw">TEXT</span>,{"\n"}
  <span className="kw">PRIMARY KEY</span> (code, at){"\n"}
) <span className="kw">PARTITION BY RANGE</span> (at);{"\n"}
{"\n"}
<span className="cm">-- TODO: discuss with mentor — base62 vs snowflake id?</span>
              </pre>
            </div>
          )}

          {codeTab === 'api' && (
            <div className="code-panel" style={{ margin: 0, flex: 1, borderTop: 'none', boxShadow: 'none', fontSize: 12 }}>
              <pre style={{ margin: 0, fontFamily: 'inherit' }}>
<span className="cm"># API sketch</span>{"\n"}
<span className="kw">POST</span> /v1/shorten{"\n"}
  body: {"{"} url: string, custom?: string, ttl?: number {"}"} {"\n"}
  → <span className="num">201</span> {"{"} code: string, shortUrl: string {"}"} {"\n"}
{"\n"}
<span className="kw">GET</span> /:code{"\n"}
  → <span className="num">302</span> redirect → long_url{"\n"}
  fires async hit event via kafka{"\n"}
{"\n"}
<span className="kw">GET</span> /v1/stats/:code{"\n"}
  → <span className="num">200</span> {"{"} total, last24h, topReferers {"}"}{"\n"}
{"\n"}
<span className="cm"># rate limit: 100/min per api key</span>
              </pre>
            </div>
          )}

          {codeTab === 'diagram' && (
            <div style={{ flex: 1, background: '#1f1812', padding: 20, position: 'relative', minHeight: 400 }}>
              <svg viewBox="0 0 400 300" style={{ width: '100%', height: '100%' }}>
                {/* boxes */}
                {[
                  { x: 20, y: 20, w: 80, h: 36, l: 'client', c: '#dcc690' },
                  { x: 160, y: 20, w: 80, h: 36, l: 'lb', c: '#b8692a' },
                  { x: 160, y: 80, w: 80, h: 36, l: 'api gw', c: '#3d6149' },
                  { x: 20, y: 140, w: 80, h: 36, l: 'redis', c: '#a23a2a' },
                  { x: 160, y: 140, w: 80, h: 36, l: 'pg urls', c: '#3b6a8f' },
                  { x: 300, y: 140, w: 80, h: 36, l: 'kafka', c: '#7a4a8f' },
                  { x: 300, y: 220, w: 80, h: 36, l: 'clickhouse', c: '#5a7f4c' },
                ].map((b, i) => (
                  <g key={i}>
                    <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={b.c} stroke="#f6ead0" strokeWidth="2" />
                    <text x={b.x + b.w / 2} y={b.y + b.h / 2 + 4} textAnchor="middle" fontFamily="Pixelify Sans" fontSize="12" fill="#f6ead0">{b.l}</text>
                  </g>
                ))}
                {/* arrows */}
                {[
                  [100, 38, 160, 38], [200, 56, 200, 80],
                  [200, 116, 200, 140], [160, 158, 100, 158],
                  [240, 158, 300, 158], [340, 176, 340, 220],
                ].map((a, i) => (
                  <line key={i} x1={a[0]} y1={a[1]} x2={a[2]} y2={a[3]} stroke="#e9b866" strokeWidth="2" markerEnd="url(#arrow)" />
                ))}
                <defs>
                  <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <polygon points="0 0, 6 3, 0 6" fill="#e9b866" />
                  </marker>
                </defs>
                {/* ink annotations */}
                <text x="20" y="280" fontFamily="Pixelify Sans" fontSize="10" fill="#e9b866">drawn together · 03:22</text>
              </svg>
            </div>
          )}

          {/* Live feedback strip */}
          <div style={{ padding: 10, background: 'var(--parch-2)', borderTop: '2px solid var(--ink-0)' }}>
            <div className="mono text-mute mb-2" style={{ fontSize: 9 }}>mentor's ongoing notes</div>
            {[
              ['✓ asked about scale early', 'moss'],
              ['✓ proposed partitioning', 'moss'],
              ['⚠ haven\'t covered collisions yet', 'ember'],
              ['○ cache invalidation strategy?', ''],
            ].map(([t, c], i) => (
              <div key={i} className="mono" style={{
                fontSize: 10,
                color: c === 'moss' ? 'var(--moss-1)' : c === 'ember' ? 'var(--ember-1)' : 'var(--ink-2)',
                padding: '3px 0',
              }}>{t}</div>
            ))}
          </div>
        </div>
      </div>

      <SoundAnnotation notes={[
        { at: 'mentor speaks', sfx: 'soft-voice-peak.wav', desc: 'Short parchment-rustle peak at start of each turn.' },
        { at: 'you send', sfx: 'quill-scratch.wav', desc: '120ms quill, bright.' },
        { at: 'phase advance', sfx: 'temple-bell.wav', desc: 'Single low bell when phase ticks.' },
        { at: '5min warning', sfx: 'sandglass.wav', desc: 'Grain-fall ambient for last 5 minutes.' },
      ]} />
    </div>
  );
}

/* ---------- Sound annotation sticky footer ---------- */
function SoundAnnotation({ notes }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ marginTop: 18 }}>
      <div className="panel panel--tight" style={{
        padding: 10, background: 'var(--parch-2)',
        borderStyle: 'dashed',
      }}>
        <div className="row items-center justify-between" style={{ cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
          <div className="row gap-2 items-center">
            <span className="badge badge--dark">♪ sound</span>
            <span className="mono text-mute" style={{ fontSize: 10 }}>design notes for audio · {notes.length} cues</span>
          </div>
          <span className="mono text-mute" style={{ fontSize: 10 }}>{open ? '▾ hide' : '▸ show'}</span>
        </div>
        {open && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8, marginTop: 10 }}>
            {notes.map((n, i) => (
              <div key={i} style={{ padding: 8, background: 'var(--parch-0)', border: '2px solid var(--ink-0)', borderLeft: '4px solid var(--ember-1)' }}>
                <div className="mono" style={{ fontSize: 9, color: 'var(--ember-1)' }}>{n.at}</div>
                <div style={{ fontFamily: 'Pixelify Sans', fontSize: 12, marginTop: 2 }}>{n.sfx}</div>
                <div className="text-mute" style={{ fontSize: 11, marginTop: 2 }}>{n.desc}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Empty / Error State Showcase ---------- */
function StatesScreen({ onNav }) {
  return (
    <div>
      <PageHeader
        eyebrow="DESIGN SYSTEM · states"
        title="Empty & error states"
        subtitle="Каждый экран получает иллюстрированный пустой и fallback-состояние. Они не информируют, они приглашают к действию."
        right={<button className="btn btn--sm" onClick={() => onNav('hub')}>back to hub</button>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <EmptyCard
          scene="scroll"
          title="No friends yet"
          sub="Приведи соратников — гильдия пустая, но таверна всегда открыта. Покажи druz9 другу и получи +200 ✦."
          primary="invite a friend"
          secondary="browse guilds"
        />

        <EmptyCard
          scene="quest"
          title="Quests not loaded"
          sub="Не смогли достучаться до вестника. Проверь сеть — или просто отдохни минуту, он вернётся."
          primary="retry"
          secondary="work offline"
          tone="warn"
        />

        <EmptyCard
          scene="raven"
          title="No duels in queue"
          sub="Арена тиха. Запусти матч — или попробуй Quickmatch, он найдёт соперника по твоему уровню за 30 секунд."
          primary="quickmatch"
          secondary="check ladder"
        />

        <EmptyCard
          scene="storm"
          title="You're offline"
          sub="Соединения нет. Твой прогресс сохранён локально; кэш задач активен, дуэли и чат недоступны."
          primary="reload"
          secondary="open cached tasks"
          tone="error"
        />

        <EmptyCard
          scene="chest"
          title="Inventory empty"
          sub="Сундук пока лёгкий. Первые ключи к украшениям — за ежедневные пакты и season pass."
          primary="visit merchant"
          secondary="today's pact"
        />

        <EmptyCard
          scene="owl"
          title="No mentor sessions yet"
          sub="Забронируй первого ментора — первая сессия бесплатна и даёт медаль «Послушник»."
          primary="book a mentor"
          secondary="view mentors"
        />
      </div>

      <SoundAnnotation notes={[
        { at: 'empty state mount', sfx: 'wind-distant.wav', desc: 'Low ambient wind, loopable, −18 LUFS.' },
        { at: 'error mount', sfx: 'thunder-muffled.wav', desc: 'Single muffled thunder; never on mount, only on retry fail.' },
        { at: 'retry success', sfx: 'door-open.wav', desc: 'Small creak + rise — 400ms.' },
      ]} />
    </div>
  );
}

function EmptyCard({ scene, title, sub, primary, secondary, tone }) {
  const bg = tone === 'error' ? '#2a1816' : tone === 'warn' ? '#2a2316' : '#1f1812';
  return (
    <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        height: 180, background: bg, position: 'relative',
        borderBottom: '4px solid var(--ink-0)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {scene === 'scroll' && <EmptyScene type="scroll" />}
        {scene === 'quest' && <EmptyScene type="quest" tone={tone} />}
        {scene === 'raven' && <EmptyScene type="raven" />}
        {scene === 'storm' && <EmptyScene type="storm" />}
        {scene === 'chest' && <EmptyScene type="chest" />}
        {scene === 'owl' && <EmptyScene type="owl" />}
        {tone && (
          <span className="badge" style={{
            position: 'absolute', top: 10, right: 10,
            background: tone === 'error' ? 'var(--danger)' : 'var(--ember-1)',
            color: 'var(--parch-0)', fontSize: 9,
          }}>{tone}</span>
        )}
      </div>
      <div style={{ padding: 18 }}>
        <h3 style={{ whiteSpace: 'normal' }}>{title}</h3>
        <div className="text-mute mb-3" style={{ fontSize: 12 }}>{sub}</div>
        <div className="row gap-2">
          <button className={`btn btn--sm ${tone === 'error' ? 'btn--primary' : tone === 'warn' ? 'btn--primary' : 'btn--moss'}`}>{primary}</button>
          <button className="btn btn--sm">{secondary}</button>
        </div>
      </div>
    </div>
  );
}

function EmptyScene({ type, tone }) {
  if (type === 'scroll') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, position: 'relative' }}>
      <div style={{
        width: 120, height: 80, background: 'var(--parch-0)',
        border: '4px solid var(--ink-0)',
        borderLeft: '12px solid var(--ember-0)', borderRight: '12px solid var(--ember-0)',
        padding: 8,
      }}>
        <div style={{ height: 3, background: 'var(--ink-3)', marginBottom: 6 }} />
        <div style={{ height: 3, background: 'var(--ink-3)', marginBottom: 6, width: '70%' }} />
        <div style={{ height: 3, background: 'var(--ink-3)', marginBottom: 6, width: '50%' }} />
        <div style={{ height: 3, background: 'var(--parch-3)', width: '40%' }} />
      </div>
      <Fireflies count={4} />
    </div>
  );
  if (type === 'quest') return (
    <div style={{ position: 'relative' }}>
      <div style={{ opacity: 0.4 }}><Bookshelf scale={3} /></div>
      <div style={{
        position: 'absolute', top: -8, left: -20,
        fontFamily: 'Pixelify Sans', fontSize: 56, color: 'var(--ember-1)',
        textShadow: '4px 4px 0 #0e0906',
      }}>?</div>
    </div>
  );
  if (type === 'raven') return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 30 }}>
      <RavenPet scale={3} />
      <div style={{
        width: 30, height: 6, background: 'var(--ink-3)',
        marginBottom: 14, transform: 'rotate(-10deg)',
      }} />
      <div style={{ opacity: 0.5 }}><Chest scale={3} open={false} /></div>
    </div>
  );
  if (type === 'storm') return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(100deg, transparent 0 24px, rgba(138,135,160,0.3) 24px 25px, transparent 25px 48px)',
        animation: 'rain-shift 0.5s linear infinite',
      }} />
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
        <div style={{
          fontFamily: 'Pixelify Sans', fontSize: 48, color: 'var(--ember-3)',
          textShadow: '0 0 16px rgba(233,184,102,0.6)',
        }}>✕</div>
        <div className="mono" style={{ color: 'var(--parch-0)', textAlign: 'center', fontSize: 9, marginTop: 4 }}>LINK LOST</div>
      </div>
    </div>
  );
  if (type === 'chest') return <div style={{ transform: 'scale(1.4)' }}><Chest scale={3} open={false} /></div>;
  if (type === 'owl') return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 8 }}>
      <div style={{ opacity: 0.6 }}><Statue scale={3} color="#9fb89a" /></div>
      <SpiritOrb scale={3} />
    </div>
  );
  return null;
}

/* ---------- Mobile Mock ---------- */
function MobileMockScreen() {
  const [tab, setTab] = React.useState('hub');
  const [pactDone, setPactDone] = React.useState(2);

  return (
    <div>
      <PageHeader
        eyebrow="RESPONSIVE · MOBILE PASS"
        title="druz9 on-the-go"
        subtitle="Отдельный mobile-флоу — не сжатый десктоп. Bottom-nav из 5 ключевых, карточки стекаются в столбец, duel-редактор упрощён до чтения + submit."
        right={<span className="mono text-mute">375 × 812 · iphone 13</span>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, padding: '10px 0' }}>
        <MobileFrame label="Hub">
          <div style={{ padding: 12 }}>
            <div className="mono text-mute" style={{ fontSize: 9 }}>TOWN SQUARE</div>
            <div style={{ fontFamily: 'Pixelify Sans', fontSize: 20 }}>Hello, Thornmoss</div>
            <div style={{
              padding: 10, marginTop: 10, background: 'var(--parch-0)',
              border: '2px solid var(--ink-0)', boxShadow: '2px 2px 0 var(--ink-0)',
            }}>
              <div className="mono text-mute" style={{ fontSize: 9 }}>DAILY PACT</div>
              <div style={{ fontFamily: 'Pixelify Sans', fontSize: 13, marginBottom: 6 }}>Solve 3 medium tasks</div>
              <div className="bar"><div className="bar__fill" style={{ width: `${(pactDone/3)*100}%` }} /></div>
              <div className="row items-center justify-between mt-2">
                <span className="mono" style={{ fontSize: 9 }}>{pactDone}/3 · +120 ✦</span>
                <button className="btn btn--sm" onClick={() => setPactDone(p => Math.min(3, p+1))}>tick</button>
              </div>
            </div>
            {[
              ['Arena', '3 duels live', 'var(--ember-1)'],
              ['Guild', 'siege @ 72%', 'var(--moss-1)'],
              ['Mentor', 'readiness 78%', 'var(--r-epic)'],
            ].map(([t, s, c], i) => (
              <div key={i} style={{
                padding: 10, marginTop: 8, background: 'var(--parch-0)',
                border: '2px solid var(--ink-0)', borderLeft: `6px solid ${c}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontFamily: 'Pixelify Sans', fontSize: 13 }}>{t}</div>
                  <div className="mono text-mute" style={{ fontSize: 9 }}>{s}</div>
                </div>
                <span className="mono text-mute">›</span>
              </div>
            ))}
          </div>
          <MobileTabBar active="hub" />
        </MobileFrame>

        <MobileFrame label="Duel">
          <div style={{ padding: 12, paddingBottom: 6 }}>
            <div className="row items-center justify-between">
              <button className="btn btn--sm">←</button>
              <span className="mono" style={{ fontSize: 9 }}>round 2 · 04:12</span>
              <button className="btn btn--sm" style={{ fontSize: 9 }}>quit</button>
            </div>
            <div className="row gap-2 mt-3">
              <div style={{ flex: 1, padding: 6, background: 'var(--parch-0)', border: '2px solid var(--ink-0)' }}>
                <div className="mono" style={{ fontSize: 9 }}>you · 72hp</div>
                <div className="hp-bar"><div className="hp-bar__fill" style={{ width: '72%' }} /></div>
              </div>
              <div style={{ flex: 1, padding: 6, background: 'var(--parch-0)', border: '2px solid var(--ink-0)' }}>
                <div className="mono" style={{ fontSize: 9 }}>foe · 58hp</div>
                <div className="hp-bar"><div className="hp-bar__fill hp-bar__fill--foe" style={{ width: '58%' }} /></div>
              </div>
            </div>
            <div style={{
              background: '#1a140e', color: 'var(--parch-0)',
              border: '2px solid var(--ink-0)', padding: 10, marginTop: 8,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
              height: 170, overflow: 'auto',
            }}>
              <span style={{ color: '#6a5a48' }}># BFS count paths</span><br/>
              <span style={{ color: '#e9b866' }}>def</span> <span style={{ color: '#9fb89a' }}>count_paths</span>(n, edges):<br/>
              {"  "}...<br/>
              <span className="text-mute" style={{ color: '#6a5a48', fontStyle: 'italic' }}>read-only on mobile —<br/>edit from desktop</span>
            </div>
            <div className="mono text-mute mt-2" style={{ fontSize: 9 }}>TESTS 2/3 PASS</div>
            <button className="btn btn--primary" style={{ width: '100%', marginTop: 6 }}>submit</button>
          </div>
          <MobileTabBar active="arena" />
        </MobileFrame>

        <MobileFrame label="Shop">
          <div style={{ padding: 12, paddingBottom: 6 }}>
            <div className="row items-center justify-between mb-2">
              <span style={{ fontFamily: 'Pixelify Sans', fontSize: 16 }}>Merchant</span>
              <span className="mono">● 8,420</span>
            </div>
            <div className="row gap-2 mb-2" style={{ overflowX: 'auto' }}>
              {['Featured', 'New', 'Sale', 'Limited'].map((t, i) => (
                <span key={t} className={`tweak-chip ${i === 0 ? 'tweak-chip--on' : ''}`}>{t}</span>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {['uncommon', 'rare', 'epic', 'legendary'].map((r, i) => (
                <div key={i} className={`rarity-border--${r}`} style={{ padding: 6, border: '2px solid var(--ink-0)', background: 'var(--parch-0)' }}>
                  <div style={{ height: 60, background: 'var(--parch-2)', border: '2px solid var(--ink-0)' }} />
                  <div style={{ fontFamily: 'Pixelify Sans', fontSize: 11, marginTop: 4 }}>Item {i+1}</div>
                  <div className={`rarity rarity--${r}`}>{r}</div>
                  <div className="mono mt-1">● {220 + i*160}</div>
                </div>
              ))}
            </div>
          </div>
          <MobileTabBar active="shop" />
        </MobileFrame>
      </div>

      <SoundAnnotation notes={[
        { at: 'tab switch', sfx: 'parchment-flip-short.wav', desc: '80ms flick; played on bottom-nav tap.' },
        { at: 'pact tick', sfx: 'quill-dot.wav', desc: 'Single dot, rising 3rd on subsequent ticks.' },
        { at: 'haptic · submit', sfx: 'haptic-medium', desc: 'iOS: UIImpactFeedbackMedium · Android: HapticFeedbackConstants.CONFIRM.' },
      ]} />
    </div>
  );
}

function MobileFrame({ label, children }) {
  return (
    <div>
      <div className="mono text-mute mb-2" style={{ fontSize: 9 }}>{label}</div>
      <div style={{
        width: 288, height: 580,
        background: 'var(--ink-0)', padding: 10,
        border: '4px solid var(--ink-0)',
        boxShadow: '6px 6px 0 var(--ink-0)',
        borderRadius: 24,
        position: 'relative',
      }}>
        <div style={{
          background: 'var(--parch-1)', width: '100%', height: '100%',
          borderRadius: 12, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* notch */}
          <div style={{
            position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)',
            width: 80, height: 16, background: 'var(--ink-0)', borderRadius: 8, zIndex: 5,
          }} />
          {/* status bar */}
          <div style={{
            padding: '20px 14px 6px', display: 'flex', justifyContent: 'space-between',
            fontFamily: 'Silkscreen', fontSize: 9, color: 'var(--ink-1)',
          }}>
            <span>9:41</span>
            <span>●●●●</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileTabBar({ active }) {
  const tabs = [
    { id: 'hub', l: 'hub', i: 'hub' },
    { id: 'arena', l: 'duels', i: 'arena' },
    { id: 'training', l: 'learn', i: 'training' },
    { id: 'shop', l: 'shop', i: 'shop' },
    { id: 'profile', l: 'me', i: 'profile' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: 'var(--parch-0)', borderTop: '3px solid var(--ink-0)',
      display: 'flex', padding: '6px 0',
    }}>
      {tabs.map(t => (
        <div key={t.id} style={{
          flex: 1, textAlign: 'center', padding: '4px 0',
          color: t.id === active ? 'var(--ember-1)' : 'var(--ink-2)',
          fontFamily: 'Silkscreen', fontSize: 9,
          borderTop: t.id === active ? '3px solid var(--ember-1)' : '3px solid transparent',
          marginTop: -6, paddingTop: 7,
        }}>
          <div style={{ width: 18, height: 18, margin: '0 auto 2px' }}>
            <NavIcon kind={t.i} size={18} color={t.id === active ? '#b8692a' : '#7a593a'} />
          </div>
          {t.l}
        </div>
      ))}
    </div>
  );
}

Object.assign(window, {
  TaskSolverScreen, MentorLiveScreen, StatesScreen, MobileMockScreen,
  SoundAnnotation, EmptyCard,
});
