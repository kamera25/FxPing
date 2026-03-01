import { create } from 'zustand';
import { TableSize } from '../types';

interface UIState {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    tableSize: TableSize;
    setTableSize: (size: TableSize) => void;
    platform: string;
    setPlatform: (platform: string) => void;
    currentTime: Date;
    setCurrentTime: (time: Date) => void;
}

export const useUIStore = create<UIState>((set) => ({
    activeTab: 'results',
    setActiveTab: (activeTab) => set({ activeTab }),
    tableSize: 'medium',
    setTableSize: (tableSize) => set({ tableSize }),
    platform: '',
    setPlatform: (platform) => set({ platform }),
    currentTime: new Date(),
    setCurrentTime: (currentTime) => set({ currentTime }),
}));
