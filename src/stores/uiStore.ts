// ============================================
// Fundly.id — UI State Store (Zustand)
// ============================================

import { create } from 'zustand';

interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Mobile add modal
  addModalOpen: boolean;
  setAddModalOpen: (open: boolean) => void;

  // Generic modal
  activeModal: string | null;
  openModal: (modalId: string) => void;
  closeModal: () => void;

  // Loading states
  isLoading: boolean;
  setLoading: (loading: boolean) => void;

  // Active period (for dashboard/reports)
  selectedMonth: number;
  selectedYear: number;
  setSelectedPeriod: (month: number, year: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Sidebar
  sidebarOpen: false,
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  // Mobile add modal
  addModalOpen: false,
  setAddModalOpen: (open) => set({ addModalOpen: open }),

  // Generic modal
  activeModal: null,
  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),

  // Loading
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),

  // Period
  selectedMonth: new Date().getMonth(),
  selectedYear: new Date().getFullYear(),
  setSelectedPeriod: (month, year) => set({ selectedMonth: month, selectedYear: year }),
}));
