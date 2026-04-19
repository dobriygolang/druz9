import { useState, useEffect } from 'react'
import { RpgButton, Badge } from '@/shared/ui/pixel'
import { Hero, Fireflies } from '@/shared/ui/sprites'
import { emitGameEvent } from '@/shared/lib/gamification/store'

type DemoStep =
  | 'notification'
  | 'task'
  | 'submit'
  | 'reward'
  | 'levelup'
  | 'inventory'

const STEPS: DemoStep[] = ['notification', 'task', 'submit', 'reward', 'levelup', 'inventory']

const FAKE_ITEMS = [
  { n: 'Moss Banner',     c: '#3d6149', r: 'rare'      },
  { n: 'Ember Torch',     c: '#b8692a', r: 'common'    },
  { n: 'Knight Armor',    c: '#5a3f27', r: 'rare'      },
  { n: 'Scholar Robe',    c: '#3b6a8f', r: 'uncommon'  },
  { n: 'Spirit Orb',      c: '#8fb8d4', r: 'epic'      },
  { n: 'Tutorial Sword',  c: '#c7ab6e', r: 'common', isNew: true },
]

interface Props {
  onClose: () => void
}

export function DemoFlowOverlay({ onClose }: Props) {
  const [step, setStep] = useState<DemoStep>('notification')
  const [submitPhase, setSubmitPhase] = useState<'typing' | 'loading' | 'done'>('typing')
  const [rewardFired, setRewardFired] = useState(false)

  const stepIndex = STEPS.indexOf(step)

  // Auto-advance submit animation
  useEffect(() => {
    if (step !== 'submit') { setSubmitPhase('typing'); return }
    const t1 = setTimeout(() => setSubmitPhase('loading'), 1000)
    const t2 = setTimeout(() => setSubmitPhase('done'), 2200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [step])

  const goNext = () => {
    const next = STEPS[stepIndex + 1]
    if (!next) { onClose(); return }
    if (next === 'reward' && !rewardFired) {
      emitGameEvent('code_task_solved', { difficulty: 'easy' })
      setRewardFired(true)
    }
    setStep(next)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(30,26,20,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        className="rpg-panel rpg-panel--nailed"
        style={{ maxWidth: 600, width: '100%', padding: 32, position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div className="font-silkscreen uppercase" style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em' }}>
            demo walkthrough · {stepIndex + 1}/{STEPS.length}
          </div>
          <RpgButton size="sm" variant="ghost" onClick={onClose}>✕</RpgButton>
        </div>

        {/* progress dots */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {STEPS.map((s, i) => (
            <div
              key={s}
              style={{
                flex: 1, height: 4,
                background: i <= stepIndex ? 'var(--ember-1)' : 'var(--parch-2)',
                border: '1px solid var(--ink-0)',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>

        {/* ── step content ── */}

        {step === 'notification' && (
          <div>
            <div className="font-silkscreen uppercase" style={{ color: 'var(--ember-1)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 8 }}>
              STEP 1 · NOTIFICATION
            </div>
            <h2 className="font-display" style={{ whiteSpace: 'normal', fontSize: 24, margin: '0 0 6px' }}>
              Входящий сигнал
            </h2>
            <div style={{ color: 'var(--ink-2)', fontSize: 13, marginBottom: 20 }}>
              Так выглядит нотификация о новом квесте. Они приходят от гильдий, менторов и системы.
            </div>
            {/* fake notification card */}
            <div
              style={{
                border: '3px solid var(--ember-1)',
                background: 'var(--parch-2)',
                padding: 14,
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                boxShadow: '4px 4px 0 var(--ember-1)',
                marginBottom: 12,
                animation: 'rpg-slide-in-right 0.4s ease',
              }}
            >
              <div style={{ fontSize: 28 }}>⚔️</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 15 }}>Quest unlocked: Reverse a String</div>
                <div className="font-silkscreen" style={{ fontSize: 10, color: 'var(--ink-2)', marginTop: 2 }}>
                  easy · +40 xp · +6 embers · from: daily system
                </div>
              </div>
              <Badge variant="ember">NEW</Badge>
            </div>
            <div
              style={{
                border: '2px solid var(--ink-0)',
                background: 'var(--parch-0)',
                padding: 14,
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                marginBottom: 6,
                opacity: 0.6,
              }}
            >
              <div style={{ fontSize: 22 }}>⛨</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 13 }}>Guild defense in 2h</div>
                <div className="font-silkscreen" style={{ fontSize: 9, color: 'var(--ink-2)', marginTop: 2 }}>
                  Iron Pact · join defense
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'task' && (
          <div>
            <div className="font-silkscreen uppercase" style={{ color: 'var(--ember-1)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 8 }}>
              STEP 2 · TASK
            </div>
            <h2 className="font-display" style={{ whiteSpace: 'normal', fontSize: 24, margin: '0 0 6px' }}>
              Открываем задачу
            </h2>
            <div style={{ color: 'var(--ink-2)', fontSize: 13, marginBottom: 16 }}>
              Квест ведёт тебя сюда. Здесь постановка задачи, редактор и тесты.
            </div>
            <div className="rpg-panel" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 20 }}>Reverse a String</div>
                  <div className="font-silkscreen" style={{ fontSize: 10, color: 'var(--ink-2)', marginTop: 2 }}>
                    easy · arrays · 10 min
                  </div>
                </div>
                <Badge variant="ember">ACTIVE QUEST</Badge>
              </div>
              <div className="rpg-divider" />
              <div style={{ fontSize: 13, color: 'var(--ink-1)', lineHeight: 1.6, marginTop: 10 }}>
                Given a string <code style={{ fontFamily: 'monospace', background: 'var(--parch-2)', padding: '0 4px' }}>s</code>,
                return the string reversed.
              </div>
              <div
                style={{
                  marginTop: 12,
                  padding: 10,
                  background: '#1e1a14',
                  border: '2px solid var(--ink-0)',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: '#f0e5c8',
                }}
              >
                {`reverseString("hello") → "olleh"\nreverseString("") → ""`}
              </div>
            </div>
          </div>
        )}

        {step === 'submit' && (
          <div>
            <div className="font-silkscreen uppercase" style={{ color: 'var(--ember-1)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 8 }}>
              STEP 3 · SUBMIT
            </div>
            <h2 className="font-display" style={{ whiteSpace: 'normal', fontSize: 24, margin: '0 0 6px' }}>
              Отправляем решение
            </h2>
            <div style={{ color: 'var(--ink-2)', fontSize: 13, marginBottom: 16 }}>
              Пишешь код, жмёшь Run → Submit. Задача идёт на проверку.
            </div>
            {/* code panel */}
            <div
              style={{
                padding: 14,
                background: '#1e1a14',
                border: '3px solid var(--ink-0)',
                fontFamily: 'monospace',
                fontSize: 13,
                color: '#f0e5c8',
                marginBottom: 12,
                minHeight: 80,
              }}
            >
              <span style={{ color: '#7aa6c8' }}>function</span>{' '}
              <span style={{ color: '#e9b866' }}>reverseString</span>(s){' '}{'{'}<br />
              {'  '}<span style={{ color: '#7aa6c8' }}>return</span> s.split(<span style={{ color: '#b5843b' }}>&apos;&apos;</span>).reverse().join(<span style={{ color: '#b5843b' }}>&apos;&apos;</span>)<br />
              {'}'}
              {submitPhase === 'typing' && (
                <span style={{ display: 'inline-block', width: 8, height: 14, background: 'var(--ember-1)', marginLeft: 4, animation: 'rpg-blink 0.8s step-end infinite', verticalAlign: 'bottom' }} />
              )}
            </div>
            {/* status */}
            {submitPhase === 'typing' && (
              <div className="font-silkscreen" style={{ fontSize: 10, color: 'var(--ink-2)' }}>writing solution...</div>
            )}
            {submitPhase === 'loading' && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 12, height: 12, border: '3px solid var(--ember-1)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                <span className="font-silkscreen" style={{ fontSize: 10, color: 'var(--ember-1)' }}>running tests...</span>
              </div>
            )}
            {submitPhase === 'done' && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: 'var(--moss-1)', fontSize: 16 }}>✓</span>
                <span className="font-silkscreen" style={{ fontSize: 10, color: 'var(--moss-1)' }}>3/3 tests passed · submitting...</span>
              </div>
            )}
          </div>
        )}

        {step === 'reward' && (
          <div>
            <div className="font-silkscreen uppercase" style={{ color: 'var(--ember-1)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 8 }}>
              STEP 4 · REWARD
            </div>
            <h2 className="font-display" style={{ whiteSpace: 'normal', fontSize: 24, margin: '0 0 6px' }}>
              Награды начислены
            </h2>
            <div style={{ color: 'var(--ink-2)', fontSize: 13, marginBottom: 16 }}>
              XP и embers уже в кошельке. Посмотри на тост-уведомление в правом углу.
            </div>
            <div
              style={{
                border: '3px solid var(--moss-1)',
                background: 'rgba(61,97,73,0.12)',
                padding: 18,
                textAlign: 'center',
                boxShadow: '4px 4px 0 var(--moss-1)',
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 8 }}>⚔️</div>
              <div style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 18, marginBottom: 10 }}>
                Coding task solved
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Badge variant="ember">+40 xp</Badge>
                <Badge variant="ember">+6 embers</Badge>
                <Badge variant="moss">streak +1</Badge>
              </div>
            </div>
            <div
              className="rpg-panel"
              style={{ padding: 10, background: 'var(--parch-2)', fontSize: 12, color: 'var(--ink-2)' }}
            >
              <span className="font-silkscreen" style={{ fontSize: 9 }}>↗</span>{' '}
              XP прогресс-бар в шапке обновился. Embers добавились к балансу.
            </div>
          </div>
        )}

        {step === 'levelup' && (
          <div style={{ textAlign: 'center' }}>
            <div className="font-silkscreen uppercase" style={{ color: 'var(--ember-1)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 8 }}>
              STEP 5 · LEVEL UP
            </div>
            <div className="font-silkscreen uppercase" style={{ color: 'var(--ember-1)', letterSpacing: '0.1em', marginBottom: 4 }}>
              LEVEL UP
            </div>
            <div
              style={{
                fontFamily: 'Pixelify Sans, Unbounded, monospace',
                fontSize: 88,
                color: 'var(--ember-1)',
                lineHeight: 1,
                textShadow: '6px 6px 0 var(--ink-0)',
              }}
            >
              2
            </div>
            <div className="font-display" style={{ fontSize: 20, margin: '10px 0 6px' }}>
              Squire of Embers
            </div>
            <div style={{ color: 'var(--ink-2)', fontSize: 13, marginBottom: 14 }}>
              Уровень растёт с каждой задачей. Открываются новые режимы, скины и гильдии.
            </div>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 14 }}>
              <Hero scale={4} pose="trophy" />
              <Fireflies count={8} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Badge variant="ember">+200 gold</Badge>
              <Badge variant="ember">new frame slot</Badge>
              <Badge variant="dark">title: Squire</Badge>
            </div>
          </div>
        )}

        {step === 'inventory' && (
          <div>
            <div className="font-silkscreen uppercase" style={{ color: 'var(--ember-1)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 8 }}>
              STEP 6 · INVENTORY
            </div>
            <h2 className="font-display" style={{ whiteSpace: 'normal', fontSize: 24, margin: '0 0 6px' }}>
              Инвентарь обновлён
            </h2>
            <div style={{ color: 'var(--ink-2)', fontSize: 13, marginBottom: 16 }}>
              Предметы из наград, дропа и магазина хранятся здесь. Экипируй — и твой профиль изменится.
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: 8,
                marginBottom: 14,
              }}
            >
              {FAKE_ITEMS.map((it) => (
                <div
                  key={it.n}
                  className={`rpg-rarity-border--${it.r}`}
                  style={{
                    padding: 6,
                    border: (it as { isNew?: boolean }).isNew ? '3px solid var(--ember-1)' : '3px solid var(--ink-0)',
                    background: 'var(--parch-0)',
                    position: 'relative',
                    boxShadow: (it as { isNew?: boolean }).isNew ? '0 0 0 2px var(--ember-1)' : undefined,
                  }}
                >
                  <div style={{ height: 46, background: it.c, border: '2px solid var(--ink-0)', marginBottom: 4 }} />
                  <div style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {it.n}
                  </div>
                  {(it as { isNew?: boolean }).isNew && (
                    <Badge variant="ember" style={{ position: 'absolute', top: 2, right: 2, fontSize: 7, padding: '1px 3px' }}>
                      NEW
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            <div style={{ color: 'var(--ink-2)', fontSize: 12 }}>
              <span className="font-silkscreen" style={{ color: 'var(--ember-1)', fontSize: 9 }}>↑ Tutorial Sword</span>{' '}
              добавлен из первой победы в дуэли.
            </div>
          </div>
        )}

        {/* footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
          <RpgButton size="sm" variant="ghost" onClick={onClose}>
            пропустить
          </RpgButton>
          <div className="font-silkscreen" style={{ fontSize: 9, color: 'var(--ink-2)' }}>
            {step === 'submit' && submitPhase !== 'done' ? 'подожди...' : `${stepIndex + 1} / ${STEPS.length}`}
          </div>
          <RpgButton
            variant="primary"
            onClick={goNext}
            style={{ opacity: step === 'submit' && submitPhase !== 'done' ? 0.4 : 1 }}
          >
            {stepIndex === STEPS.length - 1 ? 'Готово ✓' : 'next →'}
          </RpgButton>
        </div>
      </div>
    </div>
  )
}
