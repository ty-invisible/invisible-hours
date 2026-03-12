export interface Category {
  catId: string
  label: string
  color: string
  isDefault: boolean
  isDeleted: boolean
  sortOrder: number
}

export const DEFAULT_CATEGORIES: Category[] = [
  { catId: 'working-client-1', label: 'Working - Client 1', color: '#B8B8B8', isDefault: false, isDeleted: false, sortOrder: 0 },
  { catId: 'working-client-2', label: 'Working - Client 2', color: '#CFCFCF', isDefault: false, isDeleted: false, sortOrder: 1 },
  { catId: 'meeting',          label: 'Meeting',            color: '#E2E2E2', isDefault: false, isDeleted: false, sortOrder: 2 },
]

export const DEFAULT_CAT_IDS = new Set(DEFAULT_CATEGORIES.map((c) => c.catId))

export function contrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? '#1C1917' : '#FFFFFF'
}

export function mergeCategories(
  defaults: Category[],
  userCats: Category[]
): Category[] {
  const overrides = new Map(userCats.filter((c) => DEFAULT_CAT_IDS.has(c.catId)).map((c) => [c.catId, c]))
  const customs = userCats.filter((c) => !DEFAULT_CAT_IDS.has(c.catId))

  const merged: Category[] = defaults.map((d) => {
    const override = overrides.get(d.catId)
    if (!override) return d
    return {
      ...d,
      label: override.label,
      color: override.color,
      isDeleted: override.isDeleted,
      sortOrder: override.sortOrder,
      isDefault: true,
    }
  })

  return [...merged.filter((c) => !c.isDeleted), ...customs.filter((c) => !c.isDeleted)]
    .sort((a, b) => a.sortOrder - b.sortOrder)
}
