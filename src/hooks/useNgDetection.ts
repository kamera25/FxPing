import { useCallback } from "react";
import { useStore } from "../store/useStore";
import { PingResult } from "../types";
import { checkNgConditions, checkOkConditions } from "../utils/logic";
import { useSettings } from "./useSettings";
import { invoke } from "@tauri-apps/api/core";

export const useNgDetection = () => {
    const {
        settings,
        setTargetNgStats,
        setTargetOkStats,
        setActiveAlert
    } = useStore();
    const { playSound } = useSettings();

    const handleNgDetection = useCallback(async (newResults: PingResult[]) => {
        let alertToTrigger: { target: string, timestamp: string, reason: string } | null = null;

        setTargetNgStats(prev => {
            const { nextStats, alertToTrigger: newAlert } = checkNgConditions(prev, newResults, settings);
            alertToTrigger = newAlert;
            return nextStats;
        });

        if (alertToTrigger) {
            if (settings.ng.showPopup) {
                setActiveAlert(current => current || alertToTrigger);
            }

            if (settings.ng.playSound && settings.ng.soundFile) {
                playSound(settings.ng.soundFile);
            }

            if (settings.ng.launchProgram && settings.ng.programPath) {
                try {
                    await invoke("launch_external_program", {
                        path: settings.ng.programPath,
                        options: settings.ng.programOptions,
                        workingDir: settings.ng.programWorkingDir
                    });
                } catch (e) {
                    console.error("Failed to launch program on NG", e);
                }
            }
        }

        // Also update OK stats to reset consecutive counts when NG occurs
        setTargetOkStats(prev => {
            const { nextStats } = checkOkConditions(prev, newResults, settings);
            return nextStats;
        });
    }, [settings, setTargetNgStats, setTargetOkStats, setActiveAlert, playSound]);

    return {
        handleNgDetection
    };
};
