import { create } from 'zustand';
import { PingResult, Target, TraceResult, TargetStats, Settings, TableSize } from '../types';

interface AppState {
    // Tabs
    activeTab: string;
    setActiveTab: (tab: string) => void;

    // Targets
    targets: Target[];
    setTargets: (targets: Target[]) => void;
    newTarget: string;
    setNewTarget: (target: string) => void;
    newRemarks: string;
    setNewRemarks: (remarks: string) => void;

    // Ping Results & Stats
    results: PingResult[];
    setResults: (results: PingResult[] | ((prev: PingResult[]) => PingResult[])) => void;
    targetStats: Record<string, TargetStats>;
    setTargetStats: (stats: Record<string, TargetStats> | ((prev: Record<string, TargetStats>) => Record<string, TargetStats>)) => void;

    // Trace Results
    traceResults: TraceResult[];
    setTraceResults: (results: TraceResult[] | ((prev: TraceResult[]) => TraceResult[])) => void;
    traceProtocol: 'ICMP' | 'UDP';
    setTraceProtocol: (protocol: 'ICMP' | 'UDP') => void;
    isTracing: boolean;
    setIsTracing: (isTracing: boolean) => void;

    // Pinging Status
    isPinging: boolean;
    setIsPinging: (isPinging: boolean) => void;
    isRunActive: boolean;
    setIsRunActive: (isRunActive: boolean) => void;
    nextPingTimeMs: number | null;
    setNextPingTimeMs: (time: number | null) => void;

    // Alerts & NG/OK stats
    targetNgStats: Record<string, { consecutiveCount: number, alerted: boolean }>;
    setTargetNgStats: (stats: Record<string, { consecutiveCount: number, alerted: boolean }> | ((prev: Record<string, { consecutiveCount: number, alerted: boolean }>) => Record<string, { consecutiveCount: number, alerted: boolean }>)) => void;
    targetOkStats: Record<string, { consecutiveCount: number, alerted: boolean }>;
    setTargetOkStats: (stats: Record<string, { consecutiveCount: number, alerted: boolean }> | ((prev: Record<string, { consecutiveCount: number, alerted: boolean }>) => Record<string, { consecutiveCount: number, alerted: boolean }>)) => void;
    activeAlert: { target: string, timestamp: string, reason: string } | null;
    setActiveAlert: (alert: { target: string, timestamp: string, reason: string } | null | ((prev: { target: string, timestamp: string, reason: string } | null) => { target: string, timestamp: string, reason: string } | null)) => void;

    // Settings & UI
    settings: Settings;
    setSettings: (settings: Settings | ((prev: Settings) => Settings)) => void;
    showSettings: boolean;
    setShowSettings: (show: boolean) => void;
    tableSize: TableSize;
    setTableSize: (size: TableSize) => void;
    platform: string;
    setPlatform: (platform: string) => void;
    currentTime: Date;
    setCurrentTime: (time: Date) => void;

    // ExPing Input
    showExPingInput: boolean;
    setShowExPingInput: (show: boolean) => void;
    exPingText: string;
    setExPingText: (text: string) => void;
    isInputError: boolean;
    setIsInputError: (error: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
    // Tabs
    activeTab: 'results',
    setActiveTab: (activeTab) => set({ activeTab }),

    // Targets
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

    // Ping Results & Stats
    results: [],
    setResults: (updater) => set((state) => ({
        results: typeof updater === 'function' ? updater(state.results) : updater
    })),
    targetStats: {},
    setTargetStats: (updater) => set((state) => ({
        targetStats: typeof updater === 'function' ? updater(state.targetStats) : updater
    })),

    // Trace Results
    traceResults: [],
    setTraceResults: (updater) => set((state) => ({
        traceResults: typeof updater === 'function' ? updater(state.traceResults) : updater
    })),
    traceProtocol: 'ICMP',
    setTraceProtocol: (traceProtocol) => set({ traceProtocol }),
    isTracing: false,
    setIsTracing: (isTracing) => set({ isTracing }),

    // Pinging Status
    isPinging: false,
    setIsPinging: (isPinging) => set({ isPinging }),
    isRunActive: false,
    setIsRunActive: (isRunActive) => set({ isRunActive }),
    nextPingTimeMs: null,
    setNextPingTimeMs: (nextPingTimeMs) => set({ nextPingTimeMs }),

    // Alerts & NG/OK stats
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

    // Settings & UI
    settings: {
        repeatCount: 2,
        interval: 500,
        payloadSize: 64,
        timeout: 500,
        ttl: 255,
        repeatOrder: 'robin',
        repeatMode: 'parallel',
        periodicExecution: false,
        periodicInterval: 60,
        hideOnMinimize: false,
        saveSettingsOnExit: true,
        saveAsCsv: true,
        autoDeleteResults: true,
        maxResults: 1000,
        flashTrayIcon: true,
        prohibitFragmentation: false,
        maxHops: 20,
        resolveHostnames: true,
        ng: {
            changeTrayIcon: true,
            showPopup: true,
            playSound: false,
            soundFile: "",
            launchProgram: false,
            programPath: "",
            programOptions: "",
            programWorkingDir: "",
            executeOnDelay: false,
            delayMs: 500,
            onceOnly: false,
            notIfPreviousNg: true,
            notUntilCountReached: true,
            countToNotify: 3,
            countConsecutiveOnly: true,
            notifyOnIntervalOnly: false,
        },
        ok: {
            showPopup: false,
            playSound: false,
            soundFile: "",
            launchProgram: false,
            programPath: "",
            programOptions: "",
            programWorkingDir: "",
            notIfPreviousOk: true,
            notifyOnIntervalOnly: false,
        },
        logs: {
            autoSave: false,
            savePath: "",
            fileNameSetting: 'fixed',
            fixedName: "FxPing.log",
            prefix: "FxPing",
            extension: "LOG",
        }
    },
    setSettings: (updater) => set((state) => ({
        settings: typeof updater === 'function' ? updater(state.settings) : updater
    })),
    showSettings: false,
    setShowSettings: (showSettings) => set({ showSettings }),
    tableSize: 'medium',
    setTableSize: (tableSize) => set({ tableSize }),
    platform: '',
    setPlatform: (platform) => set({ platform }),
    currentTime: new Date(),
    setCurrentTime: (currentTime) => set({ currentTime }),

    // ExPing Input
    showExPingInput: false,
    setShowExPingInput: (showExPingInput) => set({ showExPingInput }),
    exPingText: '',
    setExPingText: (exPingText) => set({ exPingText }),
    isInputError: false,
    setIsInputError: (isInputError) => set({ isInputError }),
}));
