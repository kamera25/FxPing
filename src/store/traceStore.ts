import { create } from 'zustand';
import { TraceResult } from '../types';

interface TraceState {
    traceResults: TraceResult[];
    setTraceResults: (results: TraceResult[] | ((prev: TraceResult[]) => TraceResult[])) => void;
    traceProtocol: 'ICMP' | 'UDP';
    setTraceProtocol: (protocol: 'ICMP' | 'UDP') => void;
    isTracing: boolean;
    setIsTracing: (isTracing: boolean) => void;
}

export const useTraceStore = create<TraceState>((set) => ({
    traceResults: [],
    setTraceResults: (updater) => set((state) => ({
        traceResults: typeof updater === 'function' ? updater(state.traceResults) : updater
    })),
    traceProtocol: 'ICMP',
    setTraceProtocol: (traceProtocol) => set({ traceProtocol }),
    isTracing: false,
    setIsTracing: (isTracing) => set({ isTracing }),
}));
