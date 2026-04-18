import { useState, useEffect, useRef } from 'react'
import { Hero, SlimePet, RavenPet, SpiritOrb, Fireflies, Trophy } from '@/shared/ui/sprites'
import { RpgButton, Badge } from '@/shared/ui/pixel'
import { emitGameEvent } from '@/shared/lib/gamification/store'

const CLASSES = [
  { id: 'frontend',  t: 'Arcane Weaver',    s: 'Фронтенд · верстает миры из CSS',     c: '#7aa6c8', stat: 'CSS +3 · react +2 · a11y +2' },
  { id: 'backend',   t: 'Rune Smith',        s: 'Бэкенд · куёт API и базы',             c: '#b5843b', stat: 'sql +3 · systems +2 · node +2' },
  { id: 'algo',      t: 'Glyph Walker',      s: 'Алгоритмы · ходит по лесу графов',     c: '#6b8a5c', stat: 'dp +3 · graphs +2 · big-O +2' },
  { id: 'fullstack', t: 'Twilight Scholar',  s: 'Фуллстек · и там, и тут, но уставший', c: '#8b6fb4', stat: 'js +2 · sql +2 · ops +2' },
]

const PETS = [
  { id: 'slime', t: 'Moss Slime',  s: 'Ленивый, но верный. Любит логи.' },
  { id: 'raven', t: 'Ember Raven', s: 'Приносит новости о патчах.' },
  { id: 'orb',   t: 'Spirit Orb', s: 'Шепчет подсказки — иногда правильные.' },
]

const GOALS = [
  { id: 'interviews', t: 'Готовлюсь к интервью', s: 'FAANG, mid→senior, системный дизайн' },
  { id: 'daily',      t: 'Держу форму',           s: '15 мин в день, streak, разминка' },
  { id: 'switch',     t: 'Меняю стек',            s: 'Изучить новую область с нуля' },
  { id: 'compete',    t: 'Играю в дуэли',         s: 'Leaderboard, guild wars, рейтинг' },
]

// ── Tutorial duel mini-game ─────────────────────────────────────────────────

type DuelPhase = 'idle' | 'countdown' | 'fighting' | 'won' | 'lost'

const STARTER_CODE = `function reverseArray(arr) {
  // your code here
}`

function evalCode(src: string): { ok: boolean; output: string } {
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`${src}; return typeof reverseArray === 'function' ? reverseArray : null`)()
    if (!fn) return { ok: false, output: 'define a function named reverseArray' }
    const tests = [
      { i: [1, 2, 3], e: [3, 2, 1] },
      { i: [] as number[], e: [] as number[] },
      { i: ['a', 'b'], e: ['b', 'a'] },
    ]
    for (const t of tests) {
      const r = fn([...t.i])
      if (JSON.stringify(r) !== JSON.stringify(t.e)) {
        return { ok: false, output: `reverseArray([${t.i}]) → got [${r}] · expected [${t.e}]` }
      }
    }
    return { ok: true, output: '3/3 tests passed ✓' }
  } catch (e: unknown) {
    return { ok: false, output: `Error: ${(e as Error).message}` }
  }
}

interface TutorialDuelProps {
  name: string
  klassLabel: string
  onWin: () => void
}

function TutorialDuel({ name, klassLabel, onWin }: TutorialDuelProps) {
  const [phase, setPhase] = useState<DuelPhase>('idle')
  const [count, setCount] = useState(3)
  const [timeLeft, setTimeLeft] = useState(60)
  const [code, setCode] = useState(STARTER_CODE)
  const [testResult, setTestResult] = useState<{ ok: boolean; output: string } | null>(null)
  const [canSubmit, setCanSubmit] = useState(false)
  const winFiredRef = useRef(false)

  // 3-2-1 countdown
  useEffect(() => {
    if (phase !== 'countdown') return
    if (count <= 0) { setPhase('fighting'); return }
    const t = setTimeout(() => setCount((c) => c - 1), 800)
    return () => clearTimeout(t)
  }, [phase, count])

  // match timer
  useEffect(() => {
    if (phase !== 'fighting') return
    if (timeLeft <= 0) { setPhase('lost'); return }
    const id = setInterval(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearInterval(id)
  }, [phase, timeLeft])

  const handleRun = () => {
    const r = evalCode(code)
    setTestResult(r)
    if (r.ok) setCanSubmit(true)
  }

  const handleSubmit = () => {
    if (winFiredRef.current) return
    winFiredRef.current = true
    emitGameEvent('code_task_solved', { difficulty: 'easy' })
    setPhase('won')
  }

  // ── idle ──
  if (phase === 'idle') {
    return (
      <div>
        <div
          className="font-silkscreen uppercase"
          style={{ color: 'var(--ember-1)', letterSpacing: '0.1em', marginBottom: 4 }}
        >STEP 5 · FIRST TRIAL</div>
        <h2 className="font-display" style={{ whiteSpace: 'normal', fontSize: 28, margin: '0 0 8px' }}>
          Обучающая дуэль
        </h2>
        <div style={{ color: 'var(--ink-2)', marginBottom: 20, fontSize: 13 }}>
          Мягкий спарринг против тренировочного манекена. Задача: warmup. Ментор рядом.
        </div>
        {/* combatants banner */}
        <div
          style={{
            background: 'var(--parch-2)',
            border: '3px solid var(--ink-0)',
            padding: 16,
            marginBottom: 16,
            display: 'flex',
            gap: 16,
            alignItems: 'center',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <Hero scale={3} />
            <div className="font-silkscreen" style={{ fontSize: 10, marginTop: 6 }}>{name}</div>
            <div className="font-silkscreen" style={{ fontSize: 9, color: 'var(--ink-2)' }}>{klassLabel}</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div className="font-silkscreen" style={{ color: 'var(--ember-1)', fontSize: 16 }}>vs</div>
            <div className="font-silkscreen" style={{ fontSize: 9, color: 'var(--ink-2)', marginTop: 4 }}>
              reverse an array · 60s
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 64, height: 64,
                background: '#5a3f27',
                border: '3px solid var(--ink-0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, color: 'var(--parch-0)',
              }}
            >◈</div>
            <div className="font-silkscreen" style={{ fontSize: 10, marginTop: 6 }}>Dummy</div>
            <div className="font-silkscreen" style={{ fontSize: 9, color: 'var(--ink-2)' }}>training · lvl 1</div>
          </div>
        </div>
        <div
          className="rpg-panel"
          style={{ padding: 12, marginBottom: 14, background: 'var(--parch-2)', fontSize: 12, color: 'var(--ink-2)' }}
        >
          <span className="font-silkscreen" style={{ color: 'var(--ember-1)' }}>TASK ·</span>{' '}
          Напиши функцию <code style={{ fontFamily: 'monospace' }}>reverseArray(arr)</code> которая
          принимает массив и возвращает его в обратном порядке.
        </div>
        <div className="font-silkscreen" style={{ fontSize: 10, color: 'var(--ink-2)', marginBottom: 14 }}>
          награды: +40 xp · 6 embers · unlock: daily quests
        </div>
        <RpgButton variant="primary" onClick={() => { setCount(3); setPhase('countdown') }}>
          ⚔ Начать дуэль
        </RpgButton>
      </div>
    )
  }

  // ── countdown ──
  if (phase === 'countdown') {
    return (
      <div style={{ textAlign: 'center', paddingTop: 60 }}>
        <div className="font-silkscreen" style={{ fontSize: 11, color: 'var(--ink-2)', marginBottom: 20 }}>
          DUEL STARTING IN
        </div>
        <div
          style={{
            fontFamily: 'Pixelify Sans, monospace',
            fontSize: 96,
            color: count === 0 ? 'var(--moss-1)' : 'var(--ember-1)',
            textShadow: '6px 6px 0 var(--ink-0)',
            transition: 'color 0.2s',
          }}
        >
          {count === 0 ? 'GO!' : count}
        </div>
      </div>
    )
  }

  // ── won ──
  if (phase === 'won') {
    return (
      <div style={{ textAlign: 'center', paddingTop: 30 }}>
        <div className="font-silkscreen uppercase" style={{ color: 'var(--moss-1)', fontSize: 14, letterSpacing: '0.1em', marginBottom: 8 }}>
          VICTORY
        </div>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚔️</div>
        <h2 className="font-display" style={{ whiteSpace: 'normal', fontSize: 28, margin: '0 0 8px' }}>
          Dummy повержен!
        </h2>
        <div style={{ color: 'var(--ink-2)', marginBottom: 18, fontSize: 13 }}>
          Первый бой — первая победа. Награды зачислены.
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
          <Badge variant="ember">+40 xp</Badge>
          <Badge variant="ember">+6 embers</Badge>
          <Badge variant="moss">daily quests unlocked</Badge>
        </div>
        <RpgButton variant="primary" onClick={onWin}>Продолжить →</RpgButton>
      </div>
    )
  }

  // ── lost (time up) ──
  if (phase === 'lost') {
    return (
      <div style={{ textAlign: 'center', paddingTop: 30 }}>
        <div className="font-silkscreen uppercase" style={{ color: 'var(--ink-2)', fontSize: 12, letterSpacing: '0.1em', marginBottom: 8 }}>
          TIME&apos;S UP
        </div>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏱</div>
        <h2 className="font-display" style={{ whiteSpace: 'normal', fontSize: 26, margin: '0 0 8px' }}>
          Манекен устоял... на этот раз
        </h2>
        <div style={{ color: 'var(--ink-2)', marginBottom: 18, fontSize: 13 }}>
          В реальных дуэлях будет сложнее. Но это только начало.
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <RpgButton onClick={() => { setTimeLeft(60); setCode(STARTER_CODE); setTestResult(null); setCanSubmit(false); winFiredRef.current = false; setPhase('idle') }}>
            Попробовать снова
          </RpgButton>
          <RpgButton variant="primary" onClick={onWin}>Продолжить →</RpgButton>
        </div>
      </div>
    )
  }

  // ── fighting ──
  const timerPct = (timeLeft / 60) * 100
  const timerColor = timeLeft > 20 ? 'var(--moss-1)' : timeLeft > 10 ? 'var(--ember-1)' : 'var(--rpg-danger)'

  return (
    <div>
      {/* header bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div className="font-silkscreen" style={{ fontSize: 10, color: 'var(--ink-2)' }}>
          {name} vs Dummy
        </div>
        <div style={{ flex: 1, height: 8, border: '2px solid var(--ink-0)', background: 'var(--parch-2)' }}>
          <div style={{ width: `${timerPct}%`, height: '100%', background: timerColor, transition: 'width 1s linear, background 0.3s' }} />
        </div>
        <div className="font-silkscreen" style={{ fontSize: 12, color: timerColor, minWidth: 28, textAlign: 'right' }}>
          {timeLeft}s
        </div>
      </div>

      {/* task */}
      <div
        className="rpg-panel"
        style={{ padding: 10, marginBottom: 10, background: 'var(--parch-2)', fontSize: 12 }}
      >
        <span className="font-silkscreen" style={{ color: 'var(--ember-1)', fontSize: 10 }}>TASK ·</span>{' '}
        Напиши <code style={{ fontFamily: 'monospace' }}>reverseArray(arr)</code> — возвращает массив в обратном порядке.
      </div>

      {/* code editor */}
      <textarea
        value={code}
        onChange={(e) => { setCode(e.target.value); setTestResult(null); setCanSubmit(false) }}
        spellCheck={false}
        style={{
          width: '100%',
          height: 120,
          padding: '10px 12px',
          border: '3px solid var(--ink-0)',
          background: '#1e1a14',
          color: '#f0e5c8',
          fontFamily: 'monospace',
          fontSize: 13,
          resize: 'vertical',
          boxSizing: 'border-box',
          outline: 'none',
          boxShadow: '3px 3px 0 var(--ink-0)',
        }}
      />

      {/* test output */}
      {testResult && (
        <div
          style={{
            padding: '8px 12px',
            border: '2px solid',
            borderColor: testResult.ok ? 'var(--moss-1)' : 'var(--rpg-danger)',
            background: testResult.ok ? 'rgba(61,97,73,0.15)' : 'rgba(180,50,50,0.12)',
            fontFamily: 'monospace',
            fontSize: 12,
            color: testResult.ok ? 'var(--moss-1)' : 'var(--rpg-danger)',
            marginTop: 8,
          }}
        >
          {testResult.output}
        </div>
      )}

      {/* actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <RpgButton size="sm" onClick={handleRun}>▶ run</RpgButton>
        <RpgButton
          size="sm"
          variant="primary"
          onClick={handleSubmit}
          style={{ opacity: canSubmit ? 1 : 0.4, cursor: canSubmit ? 'pointer' : 'not-allowed' }}
        >
          ✓ submit
        </RpgButton>
        <div style={{ flex: 1 }} />
        <span className="font-silkscreen" style={{ fontSize: 9, color: 'var(--ink-2)', alignSelf: 'center' }}>
          submit доступен после run ✓
        </span>
      </div>
    </div>
  )
}

// ── Onboarding steps ────────────────────────────────────────────────────────

const STEPS = ['welcome', 'name', 'class', 'pet', 'goal', 'tutorial', 'done'] as const
type Step = typeof STEPS[number]

const PET_SPRITE: Record<string, React.ComponentType<{ scale?: number }>> = {
  slime: SlimePet,
  raven: RavenPet,
  orb: SpiritOrb,
}

export function OnboardingFlow({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('Thornmoss')
  const [klass, setKlass] = useState('frontend')
  const [pet, setPet] = useState('slime')
  const [goal, setGoal] = useState('interviews')

  const cur: Step = STEPS[step]
  const progress = (step / (STEPS.length - 1)) * 100
  const klassObj = CLASSES.find((k) => k.id === klass)
  const PetSprite = PET_SPRITE[pet]

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1))
  const prev = () => setStep((s) => Math.max(0, s - 1))

  const finish = () => {
    localStorage.setItem('druz9_onboarding_done', '1')
    onFinish()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'var(--parch-0)',
        backgroundImage: 'radial-gradient(ellipse at center bottom, rgba(61,97,73,0.15), transparent 60%)',
        overflow: 'auto',
        padding: '40px 20px',
      }}
    >
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div
            className="font-silkscreen uppercase"
            style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
          >
            druz9 · initiation · step {step + 1}/{STEPS.length}
          </div>
          <RpgButton size="sm" variant="ghost" onClick={finish}>skip</RpgButton>
        </div>

        {/* progress bar */}
        <div
          style={{
            height: 8,
            border: '2px solid var(--ink-0)',
            background: 'var(--parch-2)',
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: 'var(--ember-1)',
              transition: 'width 0.3s',
            }}
          />
        </div>

        {/* step content */}
        <div className="rpg-panel rpg-panel--nailed" style={{ padding: 32, minHeight: 440 }}>
          {cur === 'welcome' && (
            <div style={{ textAlign: 'center', paddingTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                <Fireflies count={14} />
              </div>
              <div
                className="font-silkscreen uppercase"
                style={{ color: 'var(--ember-1)', marginBottom: 8, letterSpacing: '0.1em' }}
              >
                WELCOME TO
              </div>
              <h1
                style={{
                  fontSize: 72,
                  margin: 0,
                  lineHeight: 1,
                  fontFamily: 'Pixelify Sans, monospace',
                  textShadow: '6px 6px 0 var(--ink-3)',
                }}
              >
                druz9
              </h1>
              <div
                style={{
                  color: 'var(--ink-2)',
                  marginTop: 18,
                  maxWidth: 420,
                  margin: '18px auto 24px',
                  fontSize: 14,
                }}
              >
                RPG-мир для программистов. Квесты, дуэли, гильдии и менторы.
                Сейчас мы создадим твоего героя и выберем путь.
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 24,
                  marginBottom: 24,
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <Hero scale={4} pose="wave" />
                  <div
                    className="font-silkscreen uppercase"
                    style={{ fontSize: 9, color: 'var(--ink-2)', marginTop: 8 }}
                  >you</div>
                </div>
                <div
                  className="font-silkscreen"
                  style={{ fontSize: 20, color: 'var(--ink-3)' }}
                >+</div>
                <div style={{ textAlign: 'center' }}>
                  <SlimePet scale={4} />
                  <div
                    className="font-silkscreen uppercase"
                    style={{ fontSize: 9, color: 'var(--ink-2)', marginTop: 8 }}
                  >companion</div>
                </div>
                <div
                  className="font-silkscreen"
                  style={{ fontSize: 20, color: 'var(--ink-3)' }}
                >=</div>
                <div style={{ textAlign: 'center' }}>
                  <Trophy scale={4} tier="gold" />
                  <div
                    className="font-silkscreen uppercase"
                    style={{ fontSize: 9, color: 'var(--ink-2)', marginTop: 8 }}
                  >legend</div>
                </div>
              </div>
              <div style={{ color: 'var(--ink-2)', fontSize: 11 }}>
                займёт ~2 минуты · можно пропустить
              </div>
            </div>
          )}

          {cur === 'name' && (
            <div>
              <div
                className="font-silkscreen uppercase"
                style={{ color: 'var(--ember-1)', letterSpacing: '0.1em', marginBottom: 4 }}
              >STEP 1 · IDENTITY</div>
              <h2 className="font-display" style={{ whiteSpace: 'normal', fontSize: 28, margin: '0 0 8px' }}>
                Как тебя звать, путник?
              </h2>
              <div style={{ color: 'var(--ink-2)', marginBottom: 20, fontSize: 13 }}>
                Это имя увидят соперники в дуэлях. Можно изменить в Settings.
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div
                  style={{
                    width: 90,
                    height: 90,
                    background: 'var(--parch-2)',
                    border: '3px solid var(--ink-0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Hero scale={3} pose="idle" />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    className="font-silkscreen uppercase"
                    style={{ fontSize: 10, color: 'var(--ink-2)', marginBottom: 8, letterSpacing: '0.08em' }}
                  >HERO NAME</div>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={18}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '3px solid var(--ink-0)',
                      background: 'var(--parch-2)',
                      fontFamily: 'Pixelify Sans, monospace',
                      fontSize: 22,
                      boxShadow: '3px 3px 0 var(--ink-0)',
                      outline: 'none',
                      color: 'var(--ink-0)',
                    }}
                  />
                  <div style={{ fontSize: 10, color: 'var(--ink-2)', marginTop: 6 }}>
                    {18 - name.length} символов · a-z, 0-9, -_
                  </div>
                </div>
              </div>
              <div className="rpg-divider" style={{ margin: '20px 0' }} />
              <div
                className="font-silkscreen uppercase"
                style={{ fontSize: 10, color: 'var(--ink-2)', marginBottom: 8, letterSpacing: '0.08em' }}
              >PICK A STARTER BANNER</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['mossveil', 'ember', 'dusk', 'stone', 'frost'].map((b) => (
                  <span key={b} className="rpg-tweak-chip rpg-tweak-chip--on">{b}</span>
                ))}
              </div>
            </div>
          )}

          {cur === 'class' && (
            <div>
              <div
                className="font-silkscreen uppercase"
                style={{ color: 'var(--ember-1)', letterSpacing: '0.1em', marginBottom: 4 }}
              >STEP 2 · CLASS</div>
              <h2 className="font-display" style={{ whiteSpace: 'normal', fontSize: 28, margin: '0 0 8px' }}>
                Выбери путь
              </h2>
              <div style={{ color: 'var(--ink-2)', marginBottom: 20, fontSize: 13 }}>
                Класс определяет стартовые статы. Мультикласс открывается с lvl 10.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                {CLASSES.map((k) => (
                  <div
                    key={k.id}
                    onClick={() => setKlass(k.id)}
                    style={{
                      padding: 14,
                      border: '3px solid',
                      borderColor: klass === k.id ? 'var(--ember-1)' : 'var(--ink-0)',
                      background: klass === k.id ? 'var(--parch-2)' : 'var(--parch-0)',
                      cursor: 'pointer',
                      boxShadow: klass === k.id ? '4px 4px 0 var(--ember-1)' : '3px 3px 0 var(--ink-0)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          background: k.c,
                          border: '3px solid var(--ink-0)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Hero scale={2} />
                      </div>
                      <div>
                        <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 18 }}>{k.t}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-2)' }}>{k.s}</div>
                      </div>
                    </div>
                    <div
                      className="font-silkscreen"
                      style={{ fontSize: 9, color: 'var(--ember-1)' }}
                    >{k.stat}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cur === 'pet' && (
            <div>
              <div
                className="font-silkscreen uppercase"
                style={{ color: 'var(--ember-1)', letterSpacing: '0.1em', marginBottom: 4 }}
              >STEP 3 · COMPANION</div>
              <h2 className="font-display" style={{ whiteSpace: 'normal', fontSize: 28, margin: '0 0 8px' }}>
                Кто составит компанию?
              </h2>
              <div style={{ color: 'var(--ink-2)', marginBottom: 20, fontSize: 13 }}>
                Питомец растёт вместе с тобой. Даёт пассивный бонус и реагирует на события.
              </div>
              <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
                {PETS.map((p) => {
                  const Sprite = PET_SPRITE[p.id]
                  return (
                    <div
                      key={p.id}
                      onClick={() => setPet(p.id)}
                      style={{
                        flex: 1,
                        padding: 18,
                        border: '3px solid',
                        borderColor: pet === p.id ? 'var(--ember-1)' : 'var(--ink-0)',
                        background: pet === p.id ? 'var(--parch-2)' : 'var(--parch-0)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        boxShadow: pet === p.id ? '4px 4px 0 var(--ember-1)' : '3px 3px 0 var(--ink-0)',
                      }}
                    >
                      <div
                        style={{
                          height: 80,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 8,
                        }}
                      >
                        <Sprite scale={4} />
                      </div>
                      <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 16 }}>{p.t}</div>
                      <div style={{ fontSize: 10, color: 'var(--ink-2)' }}>{p.s}</div>
                    </div>
                  )
                })}
              </div>
              <div
                className="rpg-panel"
                style={{ padding: 14, background: 'var(--parch-2)' }}
              >
                <div
                  className="font-silkscreen uppercase"
                  style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                >PASSIVE BONUS</div>
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
              <div
                className="font-silkscreen uppercase"
                style={{ color: 'var(--ember-1)', letterSpacing: '0.1em', marginBottom: 4 }}
              >STEP 4 · INTENT</div>
              <h2 className="font-display" style={{ whiteSpace: 'normal', fontSize: 28, margin: '0 0 8px' }}>
                Зачем ты здесь?
              </h2>
              <div style={{ color: 'var(--ink-2)', marginBottom: 20, fontSize: 13 }}>
                Мы подберём квесты под твою мотивацию. Можно изменить позже.
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {GOALS.map((g) => (
                  <div
                    key={g.id}
                    onClick={() => setGoal(g.id)}
                    style={{
                      padding: 14,
                      border: '3px solid',
                      borderColor: goal === g.id ? 'var(--ember-1)' : 'var(--ink-0)',
                      background: goal === g.id ? 'var(--parch-2)' : 'var(--parch-0)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      boxShadow: goal === g.id ? '4px 4px 0 var(--ember-1)' : '2px 2px 0 var(--ink-0)',
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        border: '3px solid var(--ink-0)',
                        background: goal === g.id ? 'var(--ember-1)' : 'var(--parch-0)',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 16 }}>{g.t}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-2)' }}>{g.s}</div>
                    </div>
                    {goal === g.id && (
                      <span
                        className="font-silkscreen"
                        style={{ color: 'var(--ember-1)', fontSize: 10 }}
                      >CHOSEN</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {cur === 'tutorial' && (
            <TutorialDuel
              name={name}
              klassLabel={klassObj?.t ?? ''}
              onWin={next}
            />
          )}

          {cur === 'done' && (
            <div style={{ textAlign: 'center', paddingTop: 30 }}>
              <div
                className="font-silkscreen uppercase"
                style={{ color: 'var(--ember-1)', letterSpacing: '0.1em', marginBottom: 4 }}
              >INITIATION COMPLETE</div>
              <h1
                style={{
                  fontFamily: 'Pixelify Sans, monospace',
                  fontSize: 52,
                  margin: '8px 0',
                  whiteSpace: 'normal',
                  textShadow: '4px 4px 0 var(--ink-3)',
                }}
              >
                Добро пожаловать в druz9
              </h1>
              <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0 20px' }}>
                <div style={{ position: 'relative' }}>
                  <Hero scale={5} pose="trophy" />
                  <div style={{ position: 'absolute', right: -40, bottom: 0 }}>
                    <PetSprite scale={3} />
                  </div>
                </div>
              </div>
              <div
                style={{
                  color: 'var(--ink-2)',
                  maxWidth: 420,
                  margin: '0 auto 20px',
                  fontSize: 13,
                }}
              >
                {name}, {klassObj?.t}. Питомец и первая экипировка уже в инвентаре. Город ждёт.
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Badge variant="ember">+100 starter gold</Badge>
                <Badge variant="ember">1 {pet} companion</Badge>
                <Badge variant="ember">wooden sword</Badge>
                <Badge variant="dark">7-day streak protection</Badge>
              </div>
            </div>
          )}
        </div>

        {/* navigation */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 16,
          }}
        >
          <RpgButton onClick={prev} style={{ opacity: step === 0 ? 0.3 : 1 }}>
            ← back
          </RpgButton>
          <div style={{ display: 'flex', gap: 8 }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: 10,
                  height: 10,
                  border: '2px solid var(--ink-0)',
                  background: i <= step ? 'var(--ember-1)' : 'var(--parch-2)',
                }}
              />
            ))}
          </div>
          {step < STEPS.length - 1 ? (
            cur !== 'tutorial' && (
              <RpgButton variant="primary" onClick={next}>next →</RpgButton>
            )
          ) : (
            <RpgButton variant="primary" onClick={finish}>enter the world →</RpgButton>
          )}
        </div>
      </div>
    </div>
  )
}
