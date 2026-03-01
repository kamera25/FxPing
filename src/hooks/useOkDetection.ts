import { useCallback, useRef } from "react";
import { useSettingsStore } from "../store/settingsStore";
import { useAlertStore } from "../store/alertStore";
import { PingResult } from "../types";
import { checkOkConditions } from "../utils/logic";
import { invoke } from "@tauri-apps/api/core";

const playSound = async (filePath: string) => {
    if (!filePath) return;
    try {
        const playedNatively = await invoke<boolean>("play_sound_native", { path: filePath });
        if (playedNatively) return;

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
};

export const useOkDetection = () => {
    const { settings } = useSettingsStore();
    const { setTargetOkStats, setActiveAlert } = useAlertStore();

    // Use a ref to always have the latest settings without causing re-renders
    const settingsRef = useRef(settings);
    settingsRef.current = settings;

    const handleOkDetection = useCallback(async (newResults: PingResult[]) => {
        const s = settingsRef.current;
        let alertToTrigger: { target: string, timestamp: string, reason: string } | null = null;

        setTargetOkStats(prev => {
            const { nextStats, alertToTrigger: newAlert } = checkOkConditions(prev, newResults, s);
            alertToTrigger = newAlert;
            return nextStats;
        });

        if (alertToTrigger) {
            if (s.ok.showPopup) {
                setActiveAlert(current => current || alertToTrigger);
            }

            if (s.ok.playSound && s.ok.soundFile) {
                playSound(s.ok.soundFile);
            }

            if (s.ok.launchProgram && s.ok.programPath) {
                try {
                    await invoke("launch_external_program", {
                        path: s.ok.programPath,
                        options: s.ok.programOptions,
                        workingDir: s.ok.programWorkingDir
                    });
                } catch (e) {
                    console.error("Failed to launch program on OK", e);
                }
            }
        }
    }, [setTargetOkStats, setActiveAlert]);

    return {
        handleOkDetection
    };
};
