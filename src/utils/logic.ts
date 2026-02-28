import { PingResult, Target, TargetStats, Settings, TraceResult } from "../types";

/**
 * Validates if a string is a valid IPv4, IPv6, FQDN, or localhost.
 */
export function isValidHost(host: string): boolean {
    const s = host.trim();
    if (!s) return false;

    // 1. Check if it's "localhost"
    if (s.toLowerCase() === "localhost") return true;

    // 2. Simple regex for IPv4 (more precise checks are usually done via parsing, but this is good for UI feedback)
    // Ensure we match the whole string and it has exactly 4 parts
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(s)) {
        const parts = s.split('.');
        return parts.every(p => {
            const n = parseInt(p, 10);
            return n >= 0 && n <= 255;
        });
    }

    // 3. Simple check for IPv6 (contains : and valid hex/dots)
    // We can at least check if it looks like one.
    if (s.includes(':')) {
        // Very basic IPv6 format check (contains hex and colons)
        const ipv6Regex = /^[a-fA-F0-9:]+(%[a-zA-Z0-9]+)?$/;
        if (ipv6Regex.test(s)) return true;
    }

    // 4. Check if it's an FQDN or a valid hostname
    // NOTE: If it consists only of digits and dots, it might be a malformed IPv4.
    if (/^[0-9.]+$/.test(s)) {
        // If it got here, it's already failed the ipv4Regex (which strictly matches 4 parts 0-255).
        // Since it only contains digits and dots, it cannot be a valid FQDN label (must contain at least one letter to be a hostname label if we want to distinguish from IPs).
        // Actually, some standards allow all-numeric labels, but for this app, 
        // we treat all-numeric+dots as IP addresses, and they must be valid ones.
        return false;
    }

    // Using the same regex as host.rs
    const validHostRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (validHostRegex.test(s)) return true;

    return false;
}

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
        let nextConsecutive = 0;
        if (isNg) {
            nextConsecutive = current.consecutiveCount + 1;
        } else {
            // If counting consecutive only, reset on success.
            // Otherwise, keep the total count until we decide to reset it (e.g. at interval start).
            nextConsecutive = settings.ng.countConsecutiveOnly ? 0 : current.consecutiveCount;
        }
        let nextAlerted = isNg ? current.alerted : (settings.ng.countConsecutiveOnly ? false : current.alerted);

        if (isNg && settings.ng.showPopup) {
            const threshold = settings.ng.notUntilCountReached ? settings.ng.countToNotify : 1;
            let shouldTrigger = false;

            if (nextConsecutive >= threshold) {
                shouldTrigger = true;
            }

            if (settings.ng.onceOnly && nextAlerted) {
                shouldTrigger = false;
            }

            if (!settings.ng.onceOnly && settings.ng.notIfPreviousNg && current.consecutiveCount >= threshold) {
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
