import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Lang = 'ru' | 'kz'

interface LangStore {
  lang: Lang
  toggleLang: () => void
}

export const useLangStore = create<LangStore>()(
  persist(
    (set, get) => ({
      lang: 'ru',
      toggleLang: () => set({ lang: get().lang === 'ru' ? 'kz' : 'ru' }),
    }),
    { name: 'crm-lang' }
  )
)
