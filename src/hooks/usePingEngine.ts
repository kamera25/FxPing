import { useEffect, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { usePingStore } from "../store/pingStore";
import { useTargetStore } from "../store/targetStore";
import { useSettingsStore } from "../store/settingsStore";
import { useAlertStore } from "../store/alertStore";
import { PingResult, Target } from "../types";
import { updateTargetStats } from "../utils/logic";
import { useNgDetection } from "./useNgDetection";
import { useOkDetection } from "./useOkDetection";

export const usePingEngine = () => {
    const { setResults, setTargetStats, status, setNextPingTimeMs, stopPing, startPing, pausePing } = usePingStore();
    const { targets: allTargets } = useTargetStore();
    const { settings } = useSettingsStore();

    // Stabilize filtered targets with useMemo to prevent new reference on every render
    const targets = useMemo(
        () => allTargets.filter(t => t.isEnabled !== false),
        [allTargets]
    );

    const { handleNgDetection } = useNgDetection();
    const { handleOkDetection } = useOkDetection();

    // Use refs for values that the effect needs but shouldn't trigger re-runs
    const settingsRef = useRef(settings);
    settingsRef.current = settings;
    const handleNgDetectionRef = useRef(handleNgDetection);
    handleNgDetectionRef.current = handleNgDetection;
    const handleOkDetectionRef = useRef(handleOkDetection);
    handleOkDetectionRef.current = handleOkDetection;

    const isPinging = status === 'running';
    const isWaiting = status === 'waiting';

    useEffect(() => {
        let interval: number | undefined;
        if (isPinging && targets.length > 0) {
            const s = settingsRef.current;
            let currentIteration = 0;
            let currentTargetIndex = 0;
            let isExecuting = false;
            let lastPingTime = Date.now();

            // Reset suppression stats if notifyOnIntervalOnly is enabled
            if (s.ng.notifyOnIntervalOnly) {
                useAlertStore.getState().setTargetNgStats({});
            }
            if (s.ok.notifyOnIntervalOnly) {
                useAlertStore.getState().setTargetOkStats({});
            }

            const runPing = async () => {
                if (isExecuting) return;
                isExecuting = true;
                const currentSettings = settingsRef.current;

                if (currentSettings.repeatCount > 0) {
                    if (currentSettings.repeatMode === 'sequential') {
                        if (currentTargetIndex >= targets.length) {
                            if (currentSettings.periodicExecution) {
                                pausePing();
                            } else {
                                stopPing();
                            }
                            isExecuting = false;
                            return;
                        }
                    } else {
                        if (currentIteration >= currentSettings.repeatCount) {
                            if (currentSettings.periodicExecution) {
                                pausePing();
                            } else {
                                stopPing();
                            }
                            isExecuting = false;
                            return;
                        }
                    }
                }

                try {
                    let targetsToPing: Target[] = [];
                    if (currentSettings.repeatMode === 'parallel') {
                        targetsToPing = targets;
                        currentIteration++;
                    } else if (currentSettings.repeatMode === 'sequential') {
                        targetsToPing = [targets[currentTargetIndex]];
                        currentIteration++;
                        if (currentIteration >= currentSettings.repeatCount) {
                            currentIteration = 0;
                            currentTargetIndex++;
                        }
                    } else if (currentSettings.repeatMode === 'robin') {
                        targetsToPing = [targets[currentTargetIndex]];
                        currentTargetIndex++;
                        if (currentTargetIndex >= targets.length) {
                            currentTargetIndex = 0;
                            currentIteration++;
                        }
                    }

                    const promises = targetsToPing.map(target =>
                        invoke<PingResult>("ping_target", {
                            target: target.host,
                            remarks: target.remarks,
                            timeoutMs: currentSettings.timeout,
                            payloadSize: currentSettings.payloadSize,
                            ttl: currentSettings.ttl
                        })
                    );

                    const newResults = await Promise.all(promises);

                    setResults(prev => {
                        const combined = [...prev, ...newResults];
                        if (currentSettings.autoDeleteResults && combined.length > currentSettings.maxResults) {
                            return combined.slice(-currentSettings.maxResults);
                        }
                        return combined.slice(-1000);
                    });

                    setTargetStats(prev => updateTargetStats(prev, newResults));
                    handleNgDetectionRef.current(newResults);
                    handleOkDetectionRef.current(newResults);

                } catch (e) {
                    console.error("Ping error", e);
                } finally {
                    isExecuting = false;
                    lastPingTime = Date.now();
                }
            };

            runPing();
            interval = window.setInterval(runPing, s.interval);

            const countdownTimer = window.setInterval(() => {
                const now = Date.now();
                const elapsed = now - lastPingTime;
                const remaining = Math.max(0, settingsRef.current.interval - elapsed);
                setNextPingTimeMs(remaining);
            }, 100);

            return () => {
                clearInterval(interval);
                clearInterval(countdownTimer);
                setNextPingTimeMs(null);
            };
        } else {
            setNextPingTimeMs(null);
        }
    }, [isPinging, targets, stopPing, pausePing, setResults, setTargetStats, setNextPingTimeMs]);

    useEffect(() => {
        let periodicTimer: number | undefined;
        let countdownTimer: number | undefined;

        if (settings.periodicExecution && isWaiting) {
            const startTime = Date.now();
            const waitMs = settings.periodicInterval * 1000;

            periodicTimer = window.setTimeout(() => {
                startPing();
            }, waitMs);

            countdownTimer = window.setInterval(() => {
                const now = Date.now();
                const elapsed = now - startTime;
                const remaining = Math.max(0, waitMs - elapsed);
                setNextPingTimeMs(remaining);
            }, 100);
        }

        return () => {
            clearTimeout(periodicTimer);
            clearInterval(countdownTimer);
        };
    }, [settings.periodicExecution, settings.periodicInterval, isWaiting, startPing, setNextPingTimeMs]);

    return {};
};
