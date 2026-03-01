import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { usePingStore } from "../store/pingStore";
import { useSettingsStore } from "../store/settingsStore";
import { useUIStore } from "../store/uiStore";
import { formatPingResultsCsvRows } from "../utils/logic";

export const useAutoSave = () => {
    const { results, status } = usePingStore();
    const { settings } = useSettingsStore();
    const { platform, currentTime } = useUIStore();

    const isRunActive = status !== 'idle';

    const lastSavedIndexRef = useRef(0);
    const lastSavedPathRef = useRef<string | null>(null);

    // Use refs for values that change frequently but shouldn't trigger the effect
    const currentTimeRef = useRef(currentTime);
    currentTimeRef.current = currentTime;
    const platformRef = useRef(platform);
    platformRef.current = platform;

    const getLogFilePath = () => {
        const time = currentTimeRef.current;
        const p = platformRef.current;
        if (!settings.logs.savePath) return null;
        const y = String(time.getFullYear()).slice(-2);
        const m = String(time.getMonth() + 1).padStart(2, '0');
        const d = String(time.getDate()).padStart(2, '0');
        const dateStr = `${y}${m}${d}`;

        let fileName = "";
        if (settings.logs.fileNameSetting === 'fixed') {
            fileName = settings.logs.fixedName || "FxPing.log";
        } else {
            const ext = settings.logs.extension.startsWith('.') ? settings.logs.extension.slice(1) : settings.logs.extension;
            fileName = `${settings.logs.prefix}${dateStr}.${ext || 'LOG'}`;
        }

        const sep = p.toLowerCase().includes('win') ? '\\' : '/';
        let path = settings.logs.savePath;
        if (!path.endsWith(sep)) {
            path += sep;
        }
        return path + fileName;
    };

    useEffect(() => {
        if (settings.logs.autoSave && isRunActive && results.length > 0) {
            const path = getLogFilePath();
            if (!path) return;

            const resultsToSave = results.slice(lastSavedIndexRef.current);
            if (resultsToSave.length === 0 && path === lastSavedPathRef.current) return;

            if (path !== lastSavedPathRef.current) {
                // New file or session: Overwrite
                const header = "ステータス,日時,対象,IPアドレス,応答時間(ms),詳細,備考\n";
                const content = header + formatPingResultsCsvRows(results);
                invoke("save_text_file", { path, content }).then(() => {
                    lastSavedIndexRef.current = results.length;
                    lastSavedPathRef.current = path;
                }).catch(e => {
                    console.error("Auto-save log error (overwrite):", e);
                });
            } else if (resultsToSave.length > 0) {
                // Same file: Append
                const content = formatPingResultsCsvRows(resultsToSave) + "\n";
                invoke("append_text_file", { path, content }).then(() => {
                    lastSavedIndexRef.current = results.length;
                }).catch(e => {
                    console.error("Auto-save log error (append):", e);
                });
            }
        } else if (!isRunActive) {
            lastSavedIndexRef.current = 0;
            lastSavedPathRef.current = null;
        }
    }, [results, isRunActive, settings.logs.autoSave, settings.logs.savePath, settings.logs.fileNameSetting, settings.logs.fixedName, settings.logs.prefix, settings.logs.extension]);

    return {
        getLogFilePath
    };
};
