import { create } from 'zustand';

interface AlertState {
    targetNgStats: Record<string, { consecutiveCount: number, alerted: boolean }>;
    setTargetNgStats: (stats: Record<string, { consecutiveCount: number, alerted: boolean }> | ((prev: Record<string, { consecutiveCount: number, alerted: boolean }>) => Record<string, { consecutiveCount: number, alerted: boolean }>)) => void;
    targetOkStats: Record<string, { consecutiveCount: number, alerted: boolean }>;
    setTargetOkStats: (stats: Record<string, { consecutiveCount: number, alerted: boolean }> | ((prev: Record<string, { consecutiveCount: number, alerted: boolean }>) => Record<string, { consecutiveCount: number, alerted: boolean }>)) => void;
    activeAlert: { target: string, timestamp: string, reason: string } | null;
    setActiveAlert: (alert: { target: string, timestamp: string, reason: string } | null | ((prev: { target: string, timestamp: string, reason: string } | null) => { target: string, timestamp: string, reason: string } | null)) => void;
}

export const useAlertStore = create<AlertState>((set) => ({
    targetNgStats: {},
    setTargetNgStats: (updater) => set((state) => ({
        targetNgStats: typeof updater === 'function' ? updater(state.targetNgStats) : updater
    })),
    targetOkStats: {},
    setTargetOkStats: (updater) => set((state) => ({
        targetOkStats: typeof updater === 'function' ? updater(state.targetOkStats) : updater
    })),
    activeAlert: null,
    setActiveAlert: (updater) => set((state) => ({
        activeAlert: typeof updater === 'function' ? updater(state.activeAlert) : updater
    })),
}));
