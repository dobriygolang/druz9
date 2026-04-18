import { Panel, RpgButton, Badge, Bar, PageHeader } from '@/shared/ui/pixel'
import { useTranslation } from 'react-i18next'
import {
  Hero,
  SlimePet,
  RavenPet,
  SpiritOrb,
  Torch,
  Bookshelf,
  Chest,
  Banner,
  Rug,
  PixelWindow,
  Fireplace,
  Statue,
  Trophy,
  PixelCoin,
  Sword,
  Potion,
  RoomScene,
  NavIcon,
  Fireflies,
} from '@/shared/ui/sprites'

export function DesignSystemPage() {
  const { t } = useTranslation()
  return (
    <>
      <PageHeader
        eyebrow={t('designSystem.eyebrow')}
        title={t('designSystem.title')}
        subtitle={t('designSystem.subtitle')}
      />

      <Section title={t('designSystem.section.panels')}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <Panel>{t('designSystem.panels.default')}</Panel>
          <Panel variant="recessed">{t('designSystem.panels.recessed')}</Panel>
          <Panel variant="wood">{t('designSystem.panels.wood')}</Panel>
          <Panel variant="dark">{t('designSystem.panels.dark')}</Panel>
          <Panel variant="tight">{t('designSystem.panels.tight')}</Panel>
          <Panel nailed>{t('designSystem.panels.nailed')}</Panel>
        </div>
      </Section>

      <Section title={t('designSystem.section.buttons')}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <RpgButton>{t('designSystem.button.default')}</RpgButton>
          <RpgButton variant="primary">{t('designSystem.button.primary')}</RpgButton>
          <RpgButton variant="moss">{t('designSystem.button.moss')}</RpgButton>
          <RpgButton variant="ghost">{t('designSystem.button.ghost')}</RpgButton>
          <RpgButton size="sm">{t('designSystem.button.small')}</RpgButton>
          <RpgButton size="icon">⚔</RpgButton>
          <RpgButton disabled>{t('designSystem.button.disabled')}</RpgButton>
        </div>
      </Section>

      <Section title={t('designSystem.section.badges')}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Badge>{t('designSystem.button.default')}</Badge>
          <Badge variant="moss">{t('designSystem.button.moss')}</Badge>
          <Badge variant="ember">{t('designSystem.badge.ember')}</Badge>
          <Badge variant="dark">{t('designSystem.panels.dark')}</Badge>
          <span className="rpg-rarity rpg-rarity--common">{t('designSystem.rarity.common')}</span>
          <span className="rpg-rarity rpg-rarity--uncommon">{t('designSystem.rarity.uncommon')}</span>
          <span className="rpg-rarity rpg-rarity--rare">{t('designSystem.rarity.rare')}</span>
          <span className="rpg-rarity rpg-rarity--epic">{t('designSystem.rarity.epic')}</span>
          <span className="rpg-rarity rpg-rarity--legendary">{t('designSystem.rarity.legendary')}</span>
        </div>
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 400 }}>
          <Bar value={62} />
          <Bar value={40} variant="moss" />
        </div>
      </Section>

      <Section title={t('designSystem.section.characters')}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <Hero />
          <Hero pose="wave" />
          <Hero pose="trophy" />
          <SlimePet />
          <RavenPet />
          <SpiritOrb />
        </div>
      </Section>

      <Section title={t('designSystem.section.environment')}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <Torch />
          <Bookshelf />
          <Chest />
          <Chest open />
          <Banner crest="E" color="#b8692a" />
          <Rug w={20} />
          <PixelWindow />
          <PixelWindow night />
          <Fireplace />
          <Statue />
        </div>
      </Section>

      <Section title={t('designSystem.section.items')}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <Trophy />
          <Trophy tier="silver" />
          <Trophy tier="bronze" />
          <PixelCoin />
          <Sword />
          <Potion />
          <Potion color="#5a7f4c" />
          <Potion color="#7a4a8f" />
        </div>
      </Section>

      <Section title={t('designSystem.section.roomScene')}>
        <RoomScene variant="cozy" height={220}>
          <div style={{ position: 'absolute', left: 40, bottom: 20, display: 'flex', gap: 20, alignItems: 'flex-end' }}>
            <Torch />
            <Hero />
            <SlimePet />
            <Torch />
          </div>
          <Fireflies count={12} />
        </RoomScene>
      </Section>

      <Section title={t('designSystem.section.navIcons')}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', color: '#5a3f27' }}>
          {(['hub', 'profile', 'guild', 'arena', 'training', 'interview', 'events', 'podcasts', 'map', 'shop'] as const).map(
            (k) => (
              <div key={k} style={{ textAlign: 'center' }}>
                <NavIcon kind={k} size={28} color="#5a3f27" />
                <div
                  className="font-silkscreen uppercase"
                  style={{ fontSize: 9, color: 'var(--ink-2)', marginTop: 4, letterSpacing: '0.08em' }}
                >
                  {k}
                </div>
              </div>
            ),
          )}
        </div>
      </Section>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h3
        className="font-display"
        style={{ fontSize: 17, marginBottom: 12, color: 'var(--ink-0)' }}
      >
        {title}
      </h3>
      <Panel>{children}</Panel>
    </section>
  )
}
