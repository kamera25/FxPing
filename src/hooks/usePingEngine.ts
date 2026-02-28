import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "../store/useStore";
import { PingResult, Target, TraceResult } from "../types";
import { updateTargetStats } from "../utils/logic";
import { useNgDetection } from "./useNgDetection";
import { useOkDetection } from "./useOkDetection";

export const usePingEngine = () => {
    const {
        targets,
        settings,
        isPinging,
        setIsPinging,
        isRunActive,
        setIsRunActive,
        setResults,
        setTargetStats,
        setNextPingTimeMs,
        setIsTracing,
        setTraceResults,
        traceProtocol,
        platform
    } = useStore();

    const { handleNgDetection } = useNgDetection();
    const { handleOkDetection } = useOkDetection();

    const runTraceRoute = async () => {
        setIsTracing(true);
        for (const target of targets) {
            try {
                const res = await invoke<TraceResult>("traceroute_target", {
                    target: target.host,
                    timeoutMs: settings.timeout,
                    payloadSize: settings.payloadSize,
                    maxHops: settings.maxHops,
                    resolveHostnames: settings.resolveHostnames,
                    protocol: traceProtocol
                });
                setTraceResults(prev => {
                    const exists = prev.some(r => r.target === res.target);
                    if (exists) {
                        return prev.map(r => r.target === res.target ? res : r);
                    }
                    return [...prev, res];
                });
            } catch (e) {
                console.error("Trace error", e);
            }
        }
        setIsTracing(false);
    };

    useEffect(() => {
        let interval: number | undefined;
        if (isPinging && targets.length > 0) {
            let currentIteration = 0;
            let currentTargetIndex = 0;
            let isExecuting = false;
            let lastPingTime = Date.now();

            // Reset suppression stats if notifyOnIntervalOnly is enabled
            if (settings.ng.notifyOnIntervalOnly) {
                useStore.getState().setTargetNgStats({});
            }
            if (settings.ok.notifyOnIntervalOnly) {
                useStore.getState().setTargetOkStats({});
            }

            const runPing = async () => {
                if (isExecuting) return;
                isExecuting = true;

                if (settings.repeatCount > 0) {
                    if (settings.repeatMode === 'sequential') {
                        if (currentTargetIndex >= targets.length) {
                            setIsPinging(false);
                            if (!settings.periodicExecution) setIsRunActive(false);
                            isExecuting = false;
                            return;
                        }
                    } else {
                        if (currentIteration >= settings.repeatCount) {
                            setIsPinging(false);
                            if (!settings.periodicExecution) setIsRunActive(false);
                            isExecuting = false;
                            return;
                        }
                    }
                }

                try {
                    let targetsToPing: Target[] = [];
                    if (settings.repeatMode === 'parallel') {
                        targetsToPing = targets;
                        currentIteration++;
                    } else if (settings.repeatMode === 'sequential') {
                        targetsToPing = [targets[currentTargetIndex]];
                        currentIteration++;
                        if (currentIteration >= settings.repeatCount) {
                            currentIteration = 0;
                            currentTargetIndex++;
                        }
                    } else if (settings.repeatMode === 'robin') {
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
                            timeoutMs: settings.timeout,
                            payloadSize: settings.payloadSize,
                            ttl: settings.ttl
                        })
                    );

                    const newResults = await Promise.all(promises);

                    setResults(prev => {
                        const combined = [...prev, ...newResults];
                        if (settings.autoDeleteResults && combined.length > settings.maxResults) {
                            return combined.slice(-settings.maxResults);
                        }
                        return combined.slice(-1000);
                    });

                    setTargetStats(prev => updateTargetStats(prev, newResults));
                    handleNgDetection(newResults);
                    handleOkDetection(newResults);

                } catch (e) {
                    console.error("Ping error", e);
                } finally {
                    isExecuting = false;
                    lastPingTime = Date.now();
                }
            };

            runPing();
            interval = window.setInterval(runPing, settings.interval);

            const countdownTimer = window.setInterval(() => {
                const now = Date.now();
                const elapsed = now - lastPingTime;
                const remaining = Math.max(0, settings.interval - elapsed);
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
    }, [isPinging, targets, settings, setIsPinging, setIsRunActive, setResults, setTargetStats, setNextPingTimeMs, handleNgDetection, handleOkDetection]);

    useEffect(() => {
        let periodicTimer: number | undefined;
        let countdownTimer: number | undefined;

        if (settings.periodicExecution && !isPinging && isRunActive) {
            const startTime = Date.now();
            const waitMs = settings.periodicInterval * 1000;

            periodicTimer = window.setTimeout(() => {
                setIsPinging(true);
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
    }, [settings.periodicExecution, settings.periodicInterval, isPinging, isRunActive, setIsPinging, setNextPingTimeMs]);

    const handleProtocolChange = async (proto: 'ICMP' | 'UDP') => {
        if (proto === 'UDP' && platform === 'windows') {
            const admin = await invoke<boolean>("is_admin");
            if (!admin) {
                alert("Windows UDP Traceroute実行には管理者権限が必要です。管理者権限で実行してください。");
                return;
            }
        }
        useStore.getState().setTraceProtocol(proto);
    };

    return {
        runTraceRoute,
        handleProtocolChange
    };
};
