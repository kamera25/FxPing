import { useCallback } from "react";
import { useSettingsStore } from "../store/settingsStore";
import { useAlertStore } from "../store/alertStore";
import { PingResult } from "../types";
import { checkOkConditions } from "../utils/logic";
import { useSettings } from "./useSettings";
import { invoke } from "@tauri-apps/api/core";

export const useOkDetection = () => {
    const { settings } = useSettingsStore();
    const { setTargetOkStats, setActiveAlert } = useAlertStore();
    const { playSound } = useSettings();

    const handleOkDetection = useCallback(async (newResults: PingResult[]) => {
        // Use a functional update to avoid stale closure issues with targetOkStats
        // However, we need to trigger side effects (sound, program) based on the result.
        // Similar to useNgDetection.ts

        let alertToTrigger: { target: string, timestamp: string, reason: string } | null = null;

        setTargetOkStats(prev => {
            const { nextStats, alertToTrigger: newAlert } = checkOkConditions(prev, newResults, settings);
            alertToTrigger = newAlert;
            return nextStats;
        });

        if (alertToTrigger) {
            if (settings.ok.showPopup) {
                setActiveAlert(current => current || alertToTrigger);
            }

            if (settings.ok.playSound && settings.ok.soundFile) {
                playSound(settings.ok.soundFile);
            }

            if (settings.ok.launchProgram && settings.ok.programPath) {
                try {
                    await invoke("launch_external_program", {
                        path: settings.ok.programPath,
                        options: settings.ok.programOptions,
                        workingDir: settings.ok.programWorkingDir
                    });
                } catch (e) {
                    console.error("Failed to launch program on OK", e);
                }
            }
        }
    }, [settings, setTargetOkStats, setActiveAlert, playSound]);

    return {
        handleOkDetection
    };
};
