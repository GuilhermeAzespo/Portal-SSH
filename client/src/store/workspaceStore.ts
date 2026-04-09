import { create } from 'zustand';

export interface Tab {
  id: string; // The socket.io sessionId
  title: string;
  type: 'active' | 'spectator';
}

interface WorkspaceState {
  tabs: Tab[];
  activeTabId: string | null;
  addTab: (tab: Tab) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  tabs: [],
  activeTabId: null,
  addTab: (tab) => set((state) => {
    if (!state.tabs.find(t => t.id === tab.id)) {
      return { tabs: [...state.tabs, tab], activeTabId: tab.id };
    }
    return { activeTabId: tab.id };
  }),
  removeTab: (id) => set((state) => {
    const newTabs = state.tabs.filter(t => t.id !== id);
    return { 
      tabs: newTabs,
      activeTabId: state.activeTabId === id ? (newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null) : state.activeTabId
    };
  }),
  setActiveTab: (id) => set({ activeTabId: id }),
}));
