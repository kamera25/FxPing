import { create } from 'zustand';
import { PingResult, TargetStats, PingStatus } from '../types';

interface PingState {
    results: PingResult[];
    setResults: (results: PingResult[] | ((prev: PingResult[]) => PingResult[])) => void;
    targetStats: Record<string, TargetStats>;
    setTargetStats: (stats: Record<string, TargetStats> | ((prev: Record<string, TargetStats>) => Record<string, TargetStats>)) => void;
    status: PingStatus;
    setStatus: (status: PingStatus) => void;
    startPing: () => void;
    stopPing: () => void;
    pausePing: () => void;
    resumePing: () => void;
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
    status: 'idle',
    setStatus: (status) => set({ status }),
    startPing: () => set({ status: 'running' }),
    stopPing: () => set({ status: 'idle' }),
    pausePing: () => set({ status: 'waiting' }),
    resumePing: () => set({ status: 'running' }),
    nextPingTimeMs: null,
    setNextPingTimeMs: (nextPingTimeMs) => set({ nextPingTimeMs }),
}));
