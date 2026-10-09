import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  /** Whether the filter sidebar is folded away. Remembered between visits. */
  filtersCollapsed: boolean;
  toggleFilters: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      filtersCollapsed: false,
      toggleFilters: () => set((s) => ({ filtersCollapsed: !s.filtersCollapsed })),
    }),
    { name: 'zess-ui' }
  )
);
