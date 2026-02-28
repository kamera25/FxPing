import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "../store/useStore";

export const useSettings = () => {
    const { setSettings, setPlatform } = useStore();

    const selectFile = useCallback(async (section: 'ng' | 'ok', type: 'sound' | 'program') => {
        const { open } = await import("@tauri-apps/plugin-dialog");
        try {
            const selected = await open({
                multiple: false,
                directory: false,
                filters: type === 'sound'
                    ? [{ name: 'Sound', extensions: ['wav', 'mp3'] }]
                    : [{ name: 'Executable', extensions: ['exe', 'app', 'sh', 'bat', 'cmd'] }]
            });
            if (selected && !Array.isArray(selected)) {
                if (type === 'sound') {
                    setSettings((prev) => ({ ...prev, [section]: { ...prev[section], soundFile: selected } }));
                } else {
                    setSettings((prev) => ({ ...prev, [section]: { ...prev[section], programPath: selected } }));
                }
            }
        } catch (e) {
            console.error("File selection error", e);
        }
    }, [setSettings]);

    const selectDir = useCallback(async (target: 'ng' | 'ok' | 'logs' = 'ng') => {
        const { open } = await import("@tauri-apps/plugin-dialog");
        try {
            const selected = await open({
                multiple: false,
                directory: true,
            });
            if (selected && !Array.isArray(selected)) {
                if (target === 'ng' || target === 'ok') {
                    setSettings((prev) => ({ ...prev, [target]: { ...prev[target], programWorkingDir: selected } }));
                } else if (target === 'logs') {
                    setSettings((prev) => ({ ...prev, logs: { ...prev.logs, savePath: selected } }));
                }
            }
        } catch (e) {
            console.error("Directory selection error", e);
        }
    }, [setSettings]);

    const playSound = useCallback(async (filePath: string) => {
        if (!filePath) return;
        try {
            const bytes = await invoke<number[]>("read_file_bytes", { path: filePath });
            const uint8 = new Uint8Array(bytes);
            let mimeType = 'audio/wav';
            if (filePath.toLowerCase().endsWith('.mp3')) {
                mimeType = 'audio/mpeg';
            }
            const blob = new Blob([uint8], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.onended = () => URL.revokeObjectURL(url);
            await audio.play();
        } catch (e) {
            console.error("Audio error", e);
        }
    }, []);

    const initPlatform = useCallback(async () => {
        const p = await invoke<string>("get_platform");
        setPlatform(p);
    }, [setPlatform]);

    const loadSettingsFromIni = useCallback(async () => {
        try {
            const iniSettings = await invoke<Record<string, unknown> | null>("load_settings_from_ini");
            if (iniSettings) {
                setSettings((prev) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const merged: any = { ...prev };
                    for (const key of Object.keys(iniSettings)) {
                        if (key === 'ng' || key === 'ok' || key === 'logs') {
                            const section = iniSettings[key] as Record<string, unknown>;
                            if (section && typeof section === 'object') {
                                merged[key] = {
                                    ...merged[key],
                                    ...section
                                };
                            }
                        } else {
                            merged[key] = iniSettings[key];
                        }
                    }
                    return merged;
                });
            }
        } catch (e) {
            console.error("Failed to load settings from INI:", e);
        }
    }, [setSettings]);

    return {
        selectFile,
        selectDir,
        playSound,
        initPlatform,
        loadSettingsFromIni
    };
};
