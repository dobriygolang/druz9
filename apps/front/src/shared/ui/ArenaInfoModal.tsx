import { useTranslation } from 'react-i18next'
import { Modal } from './Modal'

const LEAGUES = [
  { key: 'bronze', range: '100 – 499', color: '#A0785A' },
  { key: 'silver', range: '500 – 899', color: '#8B95A5' },
  { key: 'gold', range: '900 – 1349', color: '#D4A017' },
  { key: 'platinum', range: '1350 – 1799', color: '#4ECDC4' },
  { key: 'diamond', range: '1800 – 2249', color: '#7C6FE0' },
  { key: 'master', range: '2250+', color: '#E64980' },
] as const

interface Props {
  open: boolean
  onClose: () => void
}

export function ArenaInfoModal({ open, onClose }: Props) {
  const { t } = useTranslation()

  return (
    <Modal open={open} onClose={onClose} title={t('arena.info.title')} subtitle={t('arena.info.subtitle')} size="md">
      <div className="flex flex-col gap-6">
        {/* Rating */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#111111] dark:text-[#e2e8f3]">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FFF7ED] text-xs dark:bg-[#2a1a06]">
              <span className="text-[#f59e0b]">&#9889;</span>
            </span>
            {t('arena.info.rating.title')}
          </h3>
          <p className="mt-2 text-xs leading-5 text-[#475569] dark:text-[#94a3b8]">{t('arena.info.rating.desc')}</p>
          <ul className="mt-2 flex flex-col gap-1 text-xs text-[#475569] dark:text-[#94a3b8]">
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#22c55e]" />
              {t('arena.info.rating.win')}
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#ef4444]" />
              {t('arena.info.rating.lose')}
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#6366F1]" />
              {t('arena.info.rating.difficulty')}
            </li>
          </ul>
        </section>

        {/* Leagues */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#111111] dark:text-[#e2e8f3]">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#EEF2FF] text-xs dark:bg-[#1e2a4a]">
              <span className="text-[#6366F1]">&#127942;</span>
            </span>
            {t('arena.info.leagues.title')}
          </h3>
          <p className="mt-2 text-xs text-[#475569] dark:text-[#94a3b8]">{t('arena.info.leagues.desc')}</p>
          <div className="mt-3 overflow-hidden rounded-xl border border-[#E7E8E5] dark:border-[#1e3158]">
            {LEAGUES.map((l, i) => (
              <div
                key={l.key}
                className={`flex items-center justify-between px-3 py-2 text-xs ${i > 0 ? 'border-t border-[#F2F3F0] dark:border-[#1e3158]' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="font-medium text-[#111111] dark:text-[#e2e8f3]">
                    {t(`arena.leagueLabel.${l.key}`)}
                  </span>
                </div>
                <span className="font-mono text-[#94a3b8]">{l.range}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Seasons */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#111111] dark:text-[#e2e8f3]">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F0FDF4] text-xs dark:bg-[#0a2618]">
              <span className="text-[#22c55e]">&#128197;</span>
            </span>
            {t('arena.info.seasons.title')}
          </h3>
          <p className="mt-2 text-xs leading-5 text-[#475569] dark:text-[#94a3b8]">{t('arena.info.seasons.desc')}</p>
          <ul className="mt-2 flex flex-col gap-1 text-xs text-[#475569] dark:text-[#94a3b8]">
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#94a3b8]" />
              {t('arena.info.seasons.snapshot')}
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#94a3b8]" />
              {t('arena.info.seasons.reset')}
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#94a3b8]" />
              {t('arena.info.seasons.peak')}
            </li>
          </ul>
        </section>

        {/* Rewards */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#111111] dark:text-[#e2e8f3]">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FFFBEB] text-xs dark:bg-[#2a2006]">
              <span className="text-[#f59e0b]">&#10024;</span>
            </span>
            {t('arena.info.rewards.title')}
          </h3>
          <ul className="mt-2 flex flex-col gap-1.5 text-xs text-[#475569] dark:text-[#94a3b8]">
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#f59e0b]" />
              {t('arena.info.rewards.peakRating')}
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#f59e0b]" />
              {t('arena.info.rewards.leaguePos')}
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#f59e0b]" />
              {t('arena.info.rewards.seasonHistory')}
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#f59e0b]" />
              {t('arena.info.rewards.winStreaks')}
            </li>
          </ul>
        </section>
      </div>
    </Modal>
  )
}
