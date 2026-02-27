import { useCallback } from "react";
import { useStore } from "../store/useStore";
import { PingResult } from "../types";
import { checkNgConditions } from "../utils/logic";
import { useSettings } from "./useSettings";

export const useNgDetection = () => {
    const {
        settings,
        setTargetNgStats,
        setActiveAlert
    } = useStore();
    const { playSound } = useSettings();

    const handleNgDetection = useCallback((newResults: PingResult[]) => {
        setTargetNgStats(prev => {
            const { nextStats, alertToTrigger } = checkNgConditions(prev, newResults, settings);

            if (alertToTrigger) {
                setActiveAlert(current => current || alertToTrigger);
                if (settings.ng.playSound && settings.ng.soundFile) {
                    playSound(settings.ng.soundFile);
                }
            }
            return nextStats;
        });
    }, [settings, setTargetNgStats, setActiveAlert, playSound]);

    return {
        handleNgDetection
    };
};
