import { create } from 'zustand';
import { PingResult, TargetStats } from '../types';

interface PingState {
    results: PingResult[];
    setResults: (results: PingResult[] | ((prev: PingResult[]) => PingResult[])) => void;
    targetStats: Record<string, TargetStats>;
    setTargetStats: (stats: Record<string, TargetStats> | ((prev: Record<string, TargetStats>) => Record<string, TargetStats>)) => void;
    isPinging: boolean;
    setIsPinging: (isPinging: boolean) => void;
    isRunActive: boolean;
    setIsRunActive: (isRunActive: boolean) => void;
    nextPingTimeMs: number | null;
    setNextPingTimeMs: (time: number | null) => void;
}

export const usePingStore = create<PingState>((set) => ({
    results: [],
    setResults: (updater) => set((state) => ({
        results: typeof updater === 'function' ? updater(state.results) : updater
    })),
    targetStats: {},
    setTargetStats: (updater) => set((state) => ({
        targetStats: typeof updater === 'function' ? updater(state.targetStats) : updater
    })),
    isPinging: false,
    setIsPinging: (isPinging) => set({ isPinging }),
    isRunActive: false,
    setIsRunActive: (isRunActive) => set({ isRunActive }),
    nextPingTimeMs: null,
    setNextPingTimeMs: (nextPingTimeMs) => set({ nextPingTimeMs }),
}));
