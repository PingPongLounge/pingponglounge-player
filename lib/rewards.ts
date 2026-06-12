export interface Reward {
  threshold: number
  type: "discount" | "product"
  label: string
  description: string
  discountPercent?: number
}

export const PP_REWARDS: Reward[] = [
  { threshold: 100, type: "discount", discountPercent: 10, label: "10% Rabatt",        description: "10% Rabattcode gültig im PPL Online-Shop" },
  { threshold: 300, type: "discount", discountPercent: 15, label: "15% Rabatt",        description: "15% Rabattcode gültig im PPL Online-Shop" },
  { threshold: 500, type: "product",                       label: "Gratis Schlägerhülle", description: "PPL Branded Schlägerhülle — abholbar in deiner Lounge" },
]

export const LIGA_CONFIG = {
  minMatchesForRanking: 6,
  inactivityDays: 30,
  inactivityEloPenalty: 20,
  upsetEloDiff: 100,
  upsetPingPoints: 10,
  seasonCompletionPoints: 50,
}