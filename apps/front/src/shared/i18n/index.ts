import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import en from './locales/en/translation.json'
import ru from './locales/ru/translation.json'

const resources = {
  ru: { translation: ru },
  en: { translation: en },
} as const

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ru',
    lng: 'ru',
    supportedLngs: ['ru', 'en'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'druzya-language',
    },
  })

void i18n.changeLanguage(i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'ru')

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language.startsWith('en') ? 'en' : 'ru'
})

document.documentElement.lang = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'ru'

export { i18n }
