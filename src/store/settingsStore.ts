import { create } from 'zustand';
import { Settings } from '../types';

interface SettingsState {
    settings: Settings;
    setSettings: (settings: Settings | ((prev: Settings) => Settings)) => void;
    showSettings: boolean;
    setShowSettings: (show: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
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
            showPopup: false,
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
            countToNotify: 1,
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
}));
