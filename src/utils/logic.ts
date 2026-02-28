import { PingResult, Target, TargetStats, Settings, TraceResult } from "../types";

/**
 * Parses ExPing format text into Target objects.
 * Supports "host remarks" format and ignores lines starting with ' or ‘.
 */
export function parseExPingText(text: string): { host: string; remarks: string }[] {
    const lines = text.split('\n');
    const items: { host: string; remarks: string }[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("‘") || trimmed.startsWith("'")) continue;

        let host = trimmed;
        let remarks = "";

        if (trimmed.includes(" ")) {
            const firstSpace = trimmed.indexOf(" ");
            host = trimmed.slice(0, firstSpace).trim();
            remarks = trimmed.slice(firstSpace + 1).trim();
        }

        if (host) {
            items.push({ host, remarks });
        }
    }
    return items;
}

/**
 * Updates target statistics based on a list of new ping results.
 */
export function updateTargetStats(
    prevStats: Record<string, TargetStats>,
    newResults: PingResult[]
): Record<string, TargetStats> {
    const next = { ...prevStats };
    newResults.forEach(res => {
        const stats = next[res.target] || {
            target: res.target,
            executedCount: 0,
            failedCount: 0,
            minTime: null,
            maxTime: null,
            avgTime: null,
            totalTime: 0,
            successCount: 0,
            isLastFailed: false,
        };

        stats.executedCount++;
        if (res.time_ms !== null) {
            stats.successCount++;
            stats.totalTime += res.time_ms;
            stats.minTime = stats.minTime === null ? res.time_ms : Math.min(stats.minTime, res.time_ms);
            stats.maxTime = stats.maxTime === null ? res.time_ms : Math.max(stats.maxTime, res.time_ms);
            stats.avgTime = stats.totalTime / stats.successCount;
            stats.isLastFailed = false;
        } else {
            stats.failedCount++;
            stats.isLastFailed = true;
        }
        next[res.target] = stats;
    });
    return next;
}

/**
 * NG Detection State
 */
export interface NgDetectionState {
    consecutiveCount: number;
    alerted: boolean;
}

/**
 * Result of NG detection check
 */
export interface NgDetectionResult {
    nextStats: Record<string, NgDetectionState>;
    alertToTrigger: { target: string, timestamp: string, reason: string } | null;
}

/**
 * Processes new ping results to detect NG conditions and determine if an alert should trigger.
 */
export function checkNgConditions(
    prevNgStats: Record<string, NgDetectionState>,
    newResults: PingResult[],
    settings: Settings
): NgDetectionResult {
    const nextStats = { ...prevNgStats };
    let alertToTrigger: { target: string, timestamp: string, reason: string } | null = null;

    newResults.forEach(res => {
        const isNg = res.time_ms === null;
        const current = nextStats[res.target] || { consecutiveCount: 0, alerted: false };
        const nextConsecutive = isNg ? current.consecutiveCount + 1 : 0;
        let nextAlerted = isNg ? current.alerted : false;

        if (isNg && settings.ng.showPopup) {
            const threshold = settings.ng.notUntilCountReached ? settings.ng.countToNotify : 1;
            let shouldTrigger = false;

            if (nextConsecutive === threshold) {
                shouldTrigger = true;
            }

            if (settings.ng.onceOnly && nextAlerted) {
                shouldTrigger = false;
            }

            if (shouldTrigger) {
                // Only set the first alert found in this batch if multiple occur
                if (!alertToTrigger) {
                    alertToTrigger = {
                        target: res.target,
                        timestamp: res.timestamp,
                        reason: res.status
                    };
                }
                nextAlerted = true;
            }
        } else if (!isNg) {
            nextAlerted = false;
        }

        nextStats[res.target] = { consecutiveCount: nextConsecutive, alerted: nextAlerted };
    });

    return { nextStats, alertToTrigger };
}

/**
 * Processes new ping results to detect OK conditions and determine if an alert should trigger.
 */
export function checkOkConditions(
    prevOkStats: Record<string, NgDetectionState>,
    newResults: PingResult[],
    settings: Settings
): NgDetectionResult {
    const nextStats = { ...prevOkStats };
    let alertToTrigger: { target: string, timestamp: string, reason: string } | null = null;

    newResults.forEach(res => {
        const isOk = res.time_ms !== null;
        const current = nextStats[res.target] || { consecutiveCount: 0, alerted: false };
        const nextConsecutive = isOk ? current.consecutiveCount + 1 : 0;
        let nextAlerted = current.alerted;

        if (isOk && settings.ok.showPopup) {
            let shouldTrigger = true;

            if (settings.ok.notIfPreviousOk && current.consecutiveCount > 0) {
                shouldTrigger = false;
            }

            if (shouldTrigger) {
                if (!alertToTrigger) {
                    alertToTrigger = {
                        target: res.target,
                        timestamp: res.timestamp,
                        reason: "OK"
                    };
                }
                nextAlerted = true;
            }
        } else if (!isOk) {
            nextAlerted = false;
        }

        nextStats[res.target] = { consecutiveCount: nextConsecutive, alerted: nextAlerted };
    });

    return { nextStats, alertToTrigger };
}

/**
 * Formats ping results into CSV string rows (without header).
 */
export function formatPingResultsCsvRows(results: PingResult[]): string {
    return results.map(r =>
        `${r.status.startsWith("OK") ? "OK" : "NG"},${r.timestamp},${r.target},${r.ip},${r.time_ms !== null ? r.time_ms.toFixed(2) : "-"},${r.status},${r.remarks}`
    ).join('\n');
}

/**
 * Formats statistics into CSV string rows (without header).
 */
export function formatStatsCsvRows(targets: Target[], targetStats: Record<string, TargetStats>): string {
    return targets.map(t => {
        const s = targetStats[t.host];
        if (!s) return `${t.host},0,0,0,-,-,-`;
        const failRate = ((s.failedCount / s.executedCount) * 100).toFixed(1);
        return `${s.target},${s.executedCount},${s.failedCount},${failRate},${s.minTime?.toFixed(2) || "-"},${s.maxTime?.toFixed(2) || "-"},${s.avgTime?.toFixed(2) || "-"}`;
    }).join('\n');
}

/**
 * Formats TraceRoute results into a readable text string.
 */
export function formatTraceResultsText(traceResults: TraceResult[]): string {
    let content = "";
    traceResults.forEach(res => {
        content += `Target: ${res.target} (${res.timestamp})\n`;
        content += `Ping: ${res.ping_ok ? "OK" : "NG"}\n`;
        res.hops.forEach(h => {
            content += `${h.ttl}\t${h.ip || "*"}\t${h.time_ms !== null ? h.time_ms.toFixed(2) + "ms" : "*"}\n`;
        });
        content += "----------------------------------------\n";
    });
    return content;
}
