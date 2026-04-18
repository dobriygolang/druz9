# Sound design notes — druz9 pixel RPG

Annotated cue list for future audio pass. Every cue should feel like a short 8-bit chiptune stab,
not a realistic effect. Volume is quiet by default; ambience loops at -24 LUFS, UI cues at -12 LUFS.

## Global ambience (loops)

| Surface | Cue | When | Notes |
|---|---|---|---|
| `hub` / `profile` | `ambient.room.cozy.ogg` | always, under room scene | Fire crackle + distant wind. 45s loop, crossfade. |
| `guild` | `ambient.hall.ogg` | on /guild | Low chant + banner flap. -26 LUFS, ducks on modal open. |
| `arena` / `duel` | `ambient.coliseum.ogg` | on /arena, /duel | Distant crowd. Intensifies on HP-bar damage. |
| `tavern` / `/podcasts` | `ambient.tavern.ogg` | on /podcasts idle | Tavern chatter, mute immediately on playback start. |
| `map` | `ambient.wilds.ogg` | on /map | Birds + brook. Pan with region selection. |
| `training` | silence | on /training | Only UI cues. Keeps skill tree focused. |

## Event cues

| Cue | Trigger | Sound idea |
|---|---|---|
| `ui.click` | any `rpg-btn` press | soft wood-knock + 2-note rising arpeggio |
| `ui.tab` | `.rpg-tab` switch | paper flip, 100ms |
| `ui.panel.open` | Modal mount | wooden drawer slide, 220ms |
| `ui.panel.close` | Modal unmount | drawer back + latch |
| `ui.toast.xp` | toast({kind:'xp'}) | bright chime, major third |
| `ui.toast.gold` | toast({kind:'gold'}) | coin clatter + shimmer |
| `ui.toast.purchased` | shop buy confirm | chest latch + chime |
| `ui.toast.levelup` | LevelUp modal mount | 4-note fanfare + scroll unfurl |
| `ui.toast.danger` | error / bad submission | dull thud, minor second |
| `editor.test.pass` | training task passes | small bell, single ping |
| `editor.test.fail` | training task fails | dull thud |
| `editor.submit.accepted` | all tests pass | layered chime + fanfare |
| `editor.submit.rejected` | some tests fail | low horn |
| `duel.hp.damage` | HP bar down-tick | wood-crack |
| `duel.hp.critical` | HP < 25% | heart-beat pulse loop |
| `duel.victory` | duel win | 8-note victory stab |
| `duel.defeat` | duel loss | descending 3 notes |
| `arena.queue.found` | match found toast | ember spark |
| `pact.complete` | daily pact finished | small drum + chime |
| `hero.idle.breath` | every 8s in idle | very quiet breath, only when window focused |
| `nav.sidebar.hover` | sidebar item hover | paper rustle (cap rate, 80ms) |
| `nav.route.change` | route transition | soft page turn |
| `notification.bell` | bell opens | faint bell |
| `season.pass.tier` | season tier unlocks | cascading arpeggio + crowd murmur |

## Accessibility

- Global mute toggle in Settings → Gameplay.
- Per-category sliders: **ambience**, **UI**, **events**, **music**.
- Prefer `prefers-reduced-motion` also for audio: when set, suppress the duel HP pulse and the
  firefly twinkle loops.
- Never use sound as the **only** signal for a state change. Always pair with visual.

## Implementation sketch

```ts
// shared/lib/sound/useSoundCue.ts (future)
type CueId = 'ui.click' | 'ui.tab' | 'editor.test.pass' | /* ... */

export function playCue(id: CueId, opts?: { volume?: number }) {
  // guards: respects Settings.gameplay.sound.enabled
  // loads from /public/sounds/<id>.ogg, pooled via Howler or Tone.js
}
```

Defer the pool/engine choice until after visual stabilization — v0 can use a single `<audio>` pool.
Avoid playing cues during route-exit animations; they overlap and feel noisy.

## Sourcing

- Free tier: [freesound.org](https://freesound.org) CC-BY samples, pixel-art game packs.
- Paid: consider licensing a chiptune composer for Hub/Tavern BG loops (3–4 30s themes).
- Keep every sample ≤ 80 KB ogg at 96 kbps to stay within the asset budget.
