import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "../store/useStore";

export const useSettings = () => {
    const { setSettings, setPlatform } = useStore();

    const selectFile = useCallback(async (type: 'sound' | 'program') => {
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
                    setSettings((prev) => ({ ...prev, ng: { ...prev.ng, soundFile: selected } }));
                } else {
                    setSettings((prev) => ({ ...prev, ng: { ...prev.ng, programPath: selected } }));
                }
            }
        } catch (e) {
            console.error("File selection error", e);
        }
    }, [setSettings]);

    const selectDir = useCallback(async (target: 'ng' | 'logs' = 'ng') => {
        const { open } = await import("@tauri-apps/plugin-dialog");
        try {
            const selected = await open({
                multiple: false,
                directory: true,
            });
            if (selected && !Array.isArray(selected)) {
                if (target === 'ng') {
                    setSettings((prev) => ({ ...prev, ng: { ...prev.ng, programWorkingDir: selected } }));
                } else {
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

    return {
        selectFile,
        selectDir,
        playSound,
        initPlatform
    };
};
