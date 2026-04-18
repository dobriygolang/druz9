/* ============================================================
   Onboarding + global overlays (toast / notifications / level-up)
   ============================================================ */

/* ---------- Onboarding flow ---------- */
function OnboardingScreen({ onFinish }) {
  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState('Thornmoss');
  const [klass, setKlass] = React.useState('frontend');
  const [pet, setPet] = React.useState('slime');
  const [goal, setGoal] = React.useState('interviews');

  const classes = [
    { id: 'frontend',  t: 'Arcane Weaver',   s: 'Фронтенд · верстает миры из CSS',     c: '#7aa6c8', stat: 'CSS +3 · react +2 · a11y +2' },
    { id: 'backend',   t: 'Rune Smith',      s: 'Бэкенд · куёт API и базы',              c: '#b5843b', stat: 'sql +3 · systems +2 · node +2' },
    { id: 'algo',      t: 'Glyph Walker',    s: 'Алгоритмы · ходит по лесу графов',      c: '#6b8a5c', stat: 'dp +3 · graphs +2 · big-O +2' },
    { id: 'fullstack', t: 'Twilight Scholar',s: 'Фуллстек · и там, и тут, но уставший', c: '#8b6fb4', stat: 'js +2 · sql +2 · ops +2' },
  ];
  const pets = [
    { id: 'slime',   t: 'Moss Slime',   s: 'Ленивый, но верный. Любит логи.' },
    { id: 'raven',   t: 'Ember Raven',  s: 'Приносит новости о патчах.' },
    { id: 'orb',     t: 'Spirit Orb',   s: 'Шепчет подсказки — иногда правильные.' },
  ];
  const goals = [
    { id: 'interviews', t: 'Готовлюсь к интервью',    s: 'FAANG, mid→senior, системный дизайн' },
    { id: 'daily',      t: 'Держу форму',              s: '15 мин в день, streak, разминка' },
    { id: 'switch',     t: 'Меняю стек',               s: 'Изучить новую область с нуля' },
    { id: 'compete',    t: 'Играю в дуэли',            s: 'Leaderboard, guild wars, рейтинг' },
  ];

  const steps = ['welcome', 'name', 'class', 'pet', 'goal', 'tutorial', 'done'];
  const cur = steps[step];
  const progress = ((step) / (steps.length - 1)) * 100;

  const next = () => setStep(s => Math.min(steps.length - 1, s + 1));
  const prev = () => setStep(s => Math.max(0, s - 1));

  const klassObj = classes.find(k => k.id === klass);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'var(--parch-0)',
      backgroundImage: 'radial-gradient(ellipse at center bottom, rgba(61,97,73,0.15), transparent 60%)',
      overflow: 'auto', padding: '40px 20px',
    }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        {/* progress */}
        <div className="row items-center justify-between mb-3">
          <div className="mono text-mute" style={{ fontSize: 10 }}>druz9 · initiation · step {step + 1}/{steps.length}</div>
          <button className="btn btn--sm" onClick={onFinish}>skip</button>
        </div>
        <div style={{ height: 8, border: '2px solid var(--ink-0)', background: 'var(--parch-2)', marginBottom: 28, position: 'relative' }}>
          <div style={{ width: progress + '%', height: '100%', background: 'var(--ember-1)', transition: 'width 0.3s' }} />
        </div>

        <div className="panel panel--nailed" style={{ padding: 32, minHeight: 440 }}>
          {cur === 'welcome' && (
            <div style={{ textAlign: 'center', paddingTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                <Fireflies count={14} />
              </div>
              <div className="mono" style={{ color: 'var(--ember-1)', marginBottom: 8 }}>WELCOME TO</div>
              <h1 style={{ fontSize: 72, margin: 0, lineHeight: 1, textShadow: '6px 6px 0 var(--ink-3)' }}>druz9</h1>
              <div className="text-mute mb-4" style={{ marginTop: 18, maxWidth: 420, margin: '18px auto 24px', fontSize: 14 }}>
                RPG-мир для программистов. Квесты, дуэли, гильдии и менторы.
                Сейчас мы создадим твоего героя и выберем путь.
              </div>
              <div className="row center gap-4 mb-4" style={{ alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <Hero scale={4} pose="wave" />
                  <div className="mono text-mute mt-2" style={{ fontSize: 9 }}>you</div>
                </div>
                <div className="mono" style={{ fontSize: 20, color: 'var(--ink-3)' }}>+</div>
                <div style={{ textAlign: 'center' }}>
                  <SlimePet scale={4} />
                  <div className="mono text-mute mt-2" style={{ fontSize: 9 }}>companion</div>
                </div>
                <div className="mono" style={{ fontSize: 20, color: 'var(--ink-3)' }}>=</div>
                <div style={{ textAlign: 'center' }}>
                  <Trophy scale={4} />
                  <div className="mono text-mute mt-2" style={{ fontSize: 9 }}>legend</div>
                </div>
              </div>
              <div className="text-mute" style={{ fontSize: 11, marginBottom: 6 }}>займёт ~2 минуты · можно пропустить</div>
            </div>
          )}

          {cur === 'name' && (
            <div>
              <div className="mono" style={{ color: 'var(--ember-1)' }}>STEP 1 · IDENTITY</div>
              <h2 style={{ whiteSpace: 'normal' }}>Как тебя звать, путник?</h2>
              <div className="text-mute mb-4">Это имя увидят соперники в дуэлях и сопартийцы в гильдии. Можно изменить позже в Settings.</div>
              <div className="row gap-3" style={{ alignItems: 'center' }}>
                <div style={{ width: 90, height: 90, background: 'var(--parch-2)', border: '3px solid var(--ink-0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Hero scale={3} pose="idle" />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="mono text-mute mb-2" style={{ fontSize: 10 }}>HERO NAME</div>
                  <input value={name} onChange={e => setName(e.target.value)} maxLength={18}
                    style={{ width: '100%', padding: '10px 12px', border: '3px solid var(--ink-0)', background: 'var(--parch-2)', fontFamily: 'Pixelify Sans', fontSize: 22, boxShadow: '3px 3px 0 var(--ink-0)' }} />
                  <div className="text-mute" style={{ fontSize: 10, marginTop: 6 }}>{18 - name.length} символов · a-z, 0-9, -_</div>
                </div>
              </div>
              <div className="divider" style={{ margin: '20px 0' }} />
              <div className="mono text-mute mb-2" style={{ fontSize: 10 }}>PICK A STARTER BANNER</div>
              <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
                {['mossveil', 'ember', 'dusk', 'stone', 'frost'].map(b => (
                  <span key={b} className="tweak-chip tweak-chip--on">{b}</span>
                ))}
              </div>
            </div>
          )}

          {cur === 'class' && (
            <div>
              <div className="mono" style={{ color: 'var(--ember-1)' }}>STEP 2 · CLASS</div>
              <h2 style={{ whiteSpace: 'normal' }}>Выбери путь</h2>
              <div className="text-mute mb-4">Класс определяет стартовые статы и первые задачи. Мультикласс открывается с lvl 10.</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                {classes.map(k => (
                  <div key={k.id} onClick={() => setKlass(k.id)}
                    style={{ padding: 14, border: '3px solid', borderColor: klass === k.id ? 'var(--ember-1)' : 'var(--ink-0)',
                      background: klass === k.id ? 'var(--parch-2)' : 'var(--parch-0)', cursor: 'pointer',
                      boxShadow: klass === k.id ? '4px 4px 0 var(--ember-1)' : '3px 3px 0 var(--ink-0)' }}>
                    <div className="row items-center gap-3 mb-2">
                      <div style={{ width: 48, height: 48, background: k.c, border: '3px solid var(--ink-0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Hero scale={2} />
                      </div>
                      <div>
                        <div style={{ fontFamily: 'Pixelify Sans', fontSize: 18 }}>{k.t}</div>
                        <div className="text-mute" style={{ fontSize: 11 }}>{k.s}</div>
                      </div>
                    </div>
                    <div className="mono" style={{ fontSize: 9, color: 'var(--ember-1)' }}>{k.stat}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cur === 'pet' && (
            <div>
              <div className="mono" style={{ color: 'var(--ember-1)' }}>STEP 3 · COMPANION</div>
              <h2 style={{ whiteSpace: 'normal' }}>Кто составит компанию?</h2>
              <div className="text-mute mb-4">Питомец растёт вместе с тобой. Даёт пассивный бонус и реагирует на события.</div>
              <div className="row gap-3" style={{ justifyContent: 'center', marginBottom: 20 }}>
                {pets.map(p => {
                  const Sprite = { slime: SlimePet, raven: RavenPet, orb: SpiritOrb }[p.id];
                  return (
                    <div key={p.id} onClick={() => setPet(p.id)}
                      style={{ flex: 1, padding: 18, border: '3px solid', borderColor: pet === p.id ? 'var(--ember-1)' : 'var(--ink-0)',
                        background: pet === p.id ? 'var(--parch-2)' : 'var(--parch-0)', cursor: 'pointer',
                        textAlign: 'center',
                        boxShadow: pet === p.id ? '4px 4px 0 var(--ember-1)' : '3px 3px 0 var(--ink-0)' }}>
                      <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                        <Sprite scale={4} />
                      </div>
                      <div style={{ fontFamily: 'Pixelify Sans', fontSize: 16 }}>{p.t}</div>
                      <div className="text-mute" style={{ fontSize: 10 }}>{p.s}</div>
                    </div>
                  );
                })}
              </div>
              <div className="panel" style={{ padding: 14, background: 'var(--parch-2)' }}>
                <div className="mono text-mute" style={{ fontSize: 9 }}>PASSIVE BONUS</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  {pet === 'slime' && '+5% xp за первую задачу дня'}
                  {pet === 'raven' && '+1 подсказка в сессиях с ментором'}
                  {pet === 'orb' && '+10% к вероятности редких дропов из сундуков'}
                </div>
              </div>
            </div>
          )}

          {cur === 'goal' && (
            <div>
              <div className="mono" style={{ color: 'var(--ember-1)' }}>STEP 4 · INTENT</div>
              <h2 style={{ whiteSpace: 'normal' }}>Зачем ты здесь?</h2>
              <div className="text-mute mb-4">Мы подберём квесты и сезонную цель под твою мотивацию. Не обязательство — можно изменить.</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {goals.map(g => (
                  <div key={g.id} onClick={() => setGoal(g.id)}
                    style={{ padding: 14, border: '3px solid', borderColor: goal === g.id ? 'var(--ember-1)' : 'var(--ink-0)',
                      background: goal === g.id ? 'var(--parch-2)' : 'var(--parch-0)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 14,
                      boxShadow: goal === g.id ? '4px 4px 0 var(--ember-1)' : '2px 2px 0 var(--ink-0)' }}>
                    <div style={{ width: 18, height: 18, border: '3px solid var(--ink-0)', background: goal === g.id ? 'var(--ember-1)' : 'var(--parch-0)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Pixelify Sans', fontSize: 16 }}>{g.t}</div>
                      <div className="text-mute" style={{ fontSize: 11 }}>{g.s}</div>
                    </div>
                    {goal === g.id && <span className="mono" style={{ color: 'var(--ember-1)', fontSize: 10 }}>CHOSEN</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {cur === 'tutorial' && (
            <div>
              <div className="mono" style={{ color: 'var(--ember-1)' }}>STEP 5 · FIRST TRIAL</div>
              <h2 style={{ whiteSpace: 'normal' }}>Обучающая дуэль</h2>
              <div className="text-mute mb-4">Мягкий спарринг против тренировочного деревянного манекена. Задача уровня "warmup". Ментор рядом.</div>
              <div style={{ background: 'var(--parch-2)', border: '3px solid var(--ink-0)', padding: 16, marginBottom: 14 }}>
                <div className="row gap-3" style={{ alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <Hero scale={3} />
                    <div className="mono mt-2" style={{ fontSize: 10 }}>{name}</div>
                    <div className="mono text-mute" style={{ fontSize: 9 }}>{klassObj?.t}</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div className="mono" style={{ color: 'var(--ember-1)', fontSize: 14 }}>vs</div>
                    <div className="mono text-mute" style={{ fontSize: 10 }}>reverse an array · 60s</div>
                    <div style={{ fontSize: 20, marginTop: 6 }}>⚔</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 64, height: 64, background: '#5a3f27', border: '3px solid var(--ink-0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: 'var(--parch-0)' }}>◈</div>
                    <div className="mono mt-2" style={{ fontSize: 10 }}>Dummy</div>
                    <div className="mono text-mute" style={{ fontSize: 9 }}>training · lvl 1</div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  ['⌨', 'editor', 'пиши код слева, тесты справа'],
                  ['▶', 'run', 'нажми run — запустятся public tests'],
                  ['✓', 'submit', 'если зелёно — submit. первый loot!'],
                ].map(([ic, t, s]) => (
                  <div key={t} className="panel" style={{ padding: 10, textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Silkscreen', fontSize: 18, color: 'var(--ember-1)' }}>{ic}</div>
                    <div style={{ fontFamily: 'Pixelify Sans', fontSize: 13, marginTop: 4 }}>{t}</div>
                    <div className="text-mute" style={{ fontSize: 10, marginTop: 2 }}>{s}</div>
                  </div>
                ))}
              </div>
              <div className="mono text-mute mt-3" style={{ fontSize: 10 }}>награды: +50 xp · 1 moss token · unlock: daily quests</div>
            </div>
          )}

          {cur === 'done' && (
            <div style={{ textAlign: 'center', paddingTop: 30 }}>
              <div className="mono" style={{ color: 'var(--ember-1)' }}>INITIATION COMPLETE</div>
              <h1 style={{ fontSize: 52, margin: '8px 0', whiteSpace: 'normal' }}>Добро пожаловать в druz9</h1>
              <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0 20px' }}>
                <div style={{ position: 'relative' }}>
                  <Hero scale={5} pose="trophy" />
                  <div style={{ position: 'absolute', right: -40, bottom: 0 }}>
                    {pet === 'slime' && <SlimePet scale={3} />}
                    {pet === 'raven' && <RavenPet scale={3} />}
                    {pet === 'orb'   && <SpiritOrb  scale={3} />}
                  </div>
                </div>
              </div>
              <div className="text-mute mb-4" style={{ maxWidth: 420, margin: '0 auto 20px', fontSize: 13 }}>
                {name}, {klassObj?.t}. Питомец и первая экипировка уже в инвентаре. Город ждёт.
              </div>
              <div className="row gap-2 center mb-4" style={{ flexWrap: 'wrap' }}>
                <span className="badge badge--ember">+100 starter gold</span>
                <span className="badge badge--ember">1 {pet} companion</span>
                <span className="badge badge--ember">wooden sword</span>
                <span className="badge badge--dark">7-day streak protection</span>
              </div>
            </div>
          )}
        </div>

        {/* nav */}
        <div className="row justify-between mt-3">
          <button className="btn" onClick={prev} disabled={step === 0} style={{ opacity: step === 0 ? 0.3 : 1 }}>← back</button>
          <div className="row gap-2">
            {steps.map((s, i) => (
              <div key={s} style={{ width: 10, height: 10, border: '2px solid var(--ink-0)', background: i <= step ? 'var(--ember-1)' : 'var(--parch-2)' }} />
            ))}
          </div>
          {step < steps.length - 1
            ? <button className="btn btn--primary" onClick={next}>next →</button>
            : <button className="btn btn--primary" onClick={onFinish}>enter the world →</button>}
        </div>
      </div>
    </div>
  );
}


/* ---------- Demo controls in tweaks: fire toasts/notifs/levelup ---------- */
function DemoTweaksSection({ fireToast, openNotifs, openLevelUp }) {
  return (
    <div className="group">
      <div className="group-label">demo · overlays</div>
      <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
        <span className="tweak-chip" onClick={() => fireToast({
          kind: 'QUEST', title: 'Quest accepted', body: 'Reverse an array · +50xp', icon: '✦', color: 'var(--ember-1)',
        })}>toast · quest</span>
        <span className="tweak-chip" onClick={() => fireToast({
          kind: 'DUEL', title: 'Duel invite · Frostglade', body: 'Ranked · 5 min · accept?', icon: '⚔', color: 'var(--danger)',
        })}>toast · duel</span>
        <span className="tweak-chip" onClick={() => fireToast({
          kind: 'GUILD', title: 'Guild under attack', body: 'Siege begins in 2h · join defense', icon: '⛨', color: 'var(--moss-1)',
        })}>toast · guild</span>
        <span className="tweak-chip" onClick={() => fireToast({
          kind: 'LOOT', title: 'Rare drop: Moonveil shard', body: 'Added to inventory · epic', icon: '◈', color: 'var(--r-epic)',
        })}>toast · loot</span>
      </div>
      <div className="row gap-2 mt-2" style={{ flexWrap: 'wrap' }}>
        <span className="tweak-chip" onClick={openNotifs}>open notifications</span>
        <span className="tweak-chip" onClick={openLevelUp}>trigger level up</span>
      </div>
    </div>
  );
}

Object.assign(window, { OnboardingScreen, DemoTweaksSection });
