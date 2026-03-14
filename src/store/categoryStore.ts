import { create } from 'zustand'
import type { Category } from '../lib/categories'
import { DEFAULT_CATEGORIES, mergeCategories, DEFAULT_CAT_IDS } from '../lib/categories'

interface CategoryState {
  categories: Category[]
  userCategories: Category[]
  activeCategoryId: string | null
  eraserOn: boolean

  setUserCategories: (cats: Category[]) => void
  setActive: (catId: string | null) => void
  toggleEraser: () => void

  reorder: (fromIndex: number, toIndex: number) => void
  addCategory: (cat: Category) => void
  updateCategory: (catId: string, updates: Partial<Category>) => void
  deleteCategory: (catId: string) => void

  getCategoryLabel: (catId: string) => string
  getCategoryColor: (catId: string) => string
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: DEFAULT_CATEGORIES,
  userCategories: [],
  activeCategoryId: null,
  eraserOn: false,

  setUserCategories: (cats) =>
    set({
      userCategories: cats,
      categories: mergeCategories(DEFAULT_CATEGORIES, cats),
    }),

  setActive: (catId) =>
    set((state) => ({
      activeCategoryId: state.activeCategoryId === catId ? null : catId,
      eraserOn: false,
    })),

  toggleEraser: () =>
    set((state) => ({
      eraserOn: !state.eraserOn,
      activeCategoryId: null,
    })),

  reorder: (fromIndex, toIndex) =>
    set((state) => {
      const cats = [...state.categories]
      const [moved] = cats.splice(fromIndex, 1)
      cats.splice(toIndex, 0, moved)
      const reordered = cats.map((c, i) => ({ ...c, sortOrder: i }))

      const newUserCats = [...state.userCategories]
      for (const cat of reordered) {
        const existing = newUserCats.find((uc) => uc.catId === cat.catId)
        if (existing) {
          existing.sortOrder = cat.sortOrder
        } else if (DEFAULT_CAT_IDS.has(cat.catId)) {
          newUserCats.push({ ...cat, isDefault: true })
        } else {
          newUserCats.push(cat)
        }
      }

      return {
        categories: reordered,
        userCategories: newUserCats,
      }
    }),

  addCategory: (cat) =>
    set((state) => {
      const newUserCats = [...state.userCategories, cat]
      return {
        userCategories: newUserCats,
        categories: mergeCategories(DEFAULT_CATEGORIES, newUserCats),
      }
    }),

  updateCategory: (catId, updates) =>
    set((state) => {
      const isBuiltin = DEFAULT_CAT_IDS.has(catId)
      let newUserCats = [...state.userCategories]
      const existingIdx = newUserCats.findIndex((c) => c.catId === catId)

      if (existingIdx >= 0) {
        newUserCats[existingIdx] = { ...newUserCats[existingIdx], ...updates }
      } else if (isBuiltin) {
        const def = DEFAULT_CATEGORIES.find((c) => c.catId === catId)!
        newUserCats.push({ ...def, ...updates, isDefault: true })
      }

      return {
        userCategories: newUserCats,
        categories: mergeCategories(DEFAULT_CATEGORIES, newUserCats),
      }
    }),

  deleteCategory: (catId) =>
    set((state) => {
      const newUserCats = [...state.userCategories]
      const existingIdx = newUserCats.findIndex((c) => c.catId === catId)

      if (existingIdx >= 0) {
        newUserCats[existingIdx] = { ...newUserCats[existingIdx], isDeleted: true }
      } else if (DEFAULT_CAT_IDS.has(catId)) {
        const def = DEFAULT_CATEGORIES.find((c) => c.catId === catId)!
        newUserCats.push({ ...def, isDefault: true, isDeleted: true })
      }

      return {
        userCategories: newUserCats,
        categories: mergeCategories(DEFAULT_CATEGORIES, newUserCats),
        activeCategoryId: state.activeCategoryId === catId ? null : state.activeCategoryId,
      }
    }),

  getCategoryLabel: (catId) => {
    const cat = get().categories.find((c) => c.catId === catId)
    return cat?.label ?? catId
  },

  getCategoryColor: (catId) => {
    const cat = get().categories.find((c) => c.catId === catId)
    return cat?.color ?? '#888888'
  },
}))
