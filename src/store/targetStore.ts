import { create } from 'zustand';
import { Target, TargetStats } from '../types';

interface TargetState {
    targets: Target[];
    setTargets: (targets: Target[]) => void;
    toggleTargetEnabled: (host: string) => void;
    setAllTargetsEnabled: (enabled: boolean) => void;
    setTargetsEnabledByStats: (stats: Record<string, TargetStats>, filterType: 'ok1' | 'ng1' | 'allNg' | 'allOk') => void;
    invertTargetsEnabled: () => void;
    newTarget: string;
    setNewTarget: (target: string) => void;
    newRemarks: string;
    setNewRemarks: (remarks: string) => void;
    showExPingInput: boolean;
    setShowExPingInput: (show: boolean) => void;
    exPingText: string;
    setExPingText: (text: string) => void;
    isInputError: boolean;
    setIsInputError: (error: boolean) => void;
}

export const useTargetStore = create<TargetState>((set) => ({
    targets: [
        { host: "127.0.0.1", remarks: "ローカルホスト", isEnabled: true },
        { host: "8.8.8.8", remarks: "Google DNS(v4)", isEnabled: true },
        { host: "2001:4860:4860::8888", remarks: "Google DNS(v6)", isEnabled: true }
    ],
    setTargets: (targets) => set({ targets }),
    toggleTargetEnabled: (host) => set((state) => ({
        targets: state.targets.map(t => t.host === host ? { ...t, isEnabled: t.isEnabled === false ? true : false } : t)
    })),
    setAllTargetsEnabled: (enabled) => set((state) => ({
        targets: state.targets.map(t => ({ ...t, isEnabled: enabled }))
    })),
    setTargetsEnabledByStats: (stats, filterType) => set((state) => ({
        targets: state.targets.map(t => {
            const stat = stats[t.host];
            if (!stat) return { ...t, isEnabled: false };
            let enabled = false;
            switch (filterType) {
                case 'ok1':
                    enabled = stat.successCount >= 1;
                    break;
                case 'ng1':
                    enabled = stat.failedCount >= 1;
                    break;
                case 'allNg':
                    enabled = stat.executedCount >= 1 && stat.successCount === 0;
                    break;
                case 'allOk':
                    enabled = stat.executedCount >= 1 && stat.failedCount === 0;
                    break;
            }
            return { ...t, isEnabled: enabled };
        })
    })),
    invertTargetsEnabled: () => set((state) => ({
        targets: state.targets.map(t => ({ ...t, isEnabled: t.isEnabled === false ? true : false }))
    })),
    newTarget: '',
    setNewTarget: (newTarget) => set({ newTarget }),
    newRemarks: '',
    setNewRemarks: (newRemarks) => set({ newRemarks }),
    showExPingInput: false,
    setShowExPingInput: (showExPingInput) => set({ showExPingInput }),
    exPingText: '',
    setExPingText: (exPingText) => set({ exPingText }),
    isInputError: false,
    setIsInputError: (isInputError) => set({ isInputError }),
}));
