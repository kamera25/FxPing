import { useCallback, useRef } from "react";
import { useSettingsStore } from "../store/settingsStore";
import { useAlertStore } from "../store/alertStore";
import { PingResult } from "../types";
import { checkNgConditions, checkOkConditions } from "../utils/logic";
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

export const useNgDetection = () => {
    const { settings } = useSettingsStore();
    const { setTargetNgStats, setTargetOkStats, setActiveAlert } = useAlertStore();

    // Use a ref to always have the latest settings without causing re-renders
    const settingsRef = useRef(settings);
    settingsRef.current = settings;

    const handleNgDetection = useCallback(async (newResults: PingResult[]) => {
        const s = settingsRef.current;
        let alertToTrigger: { target: string, timestamp: string, reason: string } | null = null;

        setTargetNgStats(prev => {
            const { nextStats, alertToTrigger: newAlert } = checkNgConditions(prev, newResults, s);
            alertToTrigger = newAlert;
            return nextStats;
        });

        if (alertToTrigger) {
            if (s.ng.showPopup) {
                setActiveAlert(current => current || alertToTrigger);
            }

            if (s.ng.playSound && s.ng.soundFile) {
                playSound(s.ng.soundFile);
            }

            if (s.ng.launchProgram && s.ng.programPath) {
                try {
                    await invoke("launch_external_program", {
                        path: s.ng.programPath,
                        options: s.ng.programOptions,
                        workingDir: s.ng.programWorkingDir
                    });
                } catch (e) {
                    console.error("Failed to launch program on NG", e);
                }
            }
        }

        // Also update OK stats to reset consecutive counts when NG occurs
        setTargetOkStats(prev => {
            const { nextStats } = checkOkConditions(prev, newResults, s);
            return nextStats;
        });
    }, [setTargetNgStats, setTargetOkStats, setActiveAlert]);

    return {
        handleNgDetection
    };
};
