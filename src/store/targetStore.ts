import { create } from 'zustand';
import { Target } from '../types';

interface TargetState {
    targets: Target[];
    setTargets: (targets: Target[]) => void;
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
        { host: "127.0.0.1", remarks: "ローカルホスト" },
        { host: "8.8.8.8", remarks: "Google DNS(v4)" },
        { host: "2001:4860:4860::8888", remarks: "Google DNS(v6)" }
    ],
    setTargets: (targets) => set({ targets }),
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
