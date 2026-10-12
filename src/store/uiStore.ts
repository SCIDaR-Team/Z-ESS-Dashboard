import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Appearance = 'light' | 'dark' | 'system';

interface UiState {
  /** Whether the filter sidebar is folded away. Remembered between visits. */
  filtersCollapsed: boolean;
  toggleFilters: () => void;
  appearance: Appearance;
  setAppearance: (appearance: Appearance) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      filtersCollapsed: false,
      toggleFilters: () => set((s) => ({ filtersCollapsed: !s.filtersCollapsed })),
      appearance: 'light',
      setAppearance: (appearance) => set({ appearance }),
    }),
    { name: 'zess-ui' }
  )
);
