import { describe, it, expect } from 'vitest';
import {
    parseExPingText,
    updateTargetStats,
    checkNgConditions,
    checkOkConditions,
    formatPingResultsCsvRows,
    formatStatsCsvRows,
    formatTraceResultsText,
    isValidHost
} from './logic';
import { PingResult, Target, TargetStats, Settings, TraceResult } from '../types';

describe('logic.ts', () => {
    describe('isValidHost', () => {
        it('should validate localhost', () => {
            expect(isValidHost("localhost")).toBe(true);
            expect(isValidHost("LOCALHOST")).toBe(true);
        });

        it('should validate valid IPv4', () => {
            expect(isValidHost("127.0.0.1")).toBe(true);
            expect(isValidHost("192.168.1.1")).toBe(true);
            expect(isValidHost("8.8.8.8")).toBe(true);
        });

        it('should invalidate invalid IPv4', () => {
            expect(isValidHost("256.0.0.1")).toBe(false);
            expect(isValidHost("127.0.0.1.1")).toBe(false);
            expect(isValidHost("127.0.0")).toBe(false);
        });

        it('should validate 4-part FQDNs', () => {
            expect(isValidHost("a.b.c.d")).toBe(true);
        });

        it('should validate valid IPv6', () => {
            expect(isValidHost("::1")).toBe(true);
            expect(isValidHost("2001:db8::1")).toBe(true);
            expect(isValidHost("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe(true);
            expect(isValidHost("fe80::1%en0")).toBe(true);
        });

        it('should validate valid FQDNs', () => {
            expect(isValidHost("google.com")).toBe(true);
            expect(isValidHost("www.example.co.jp")).toBe(true);
            expect(isValidHost("my-server.local")).toBe(true);
            expect(isValidHost("a.b.c")).toBe(true);
        });

        it('should invalidate invalid FQDNs', () => {
            expect(isValidHost("-google.com")).toBe(false);
            expect(isValidHost("google-.com")).toBe(false);
            expect(isValidHost("google..com")).toBe(false);
            expect(isValidHost("host_name")).toBe(false);
            expect(isValidHost("")).toBe(false);
            expect(isValidHost(" ")).toBe(false);
        });
    });

    describe('parseExPingText', () => {
        it('should parse simple hosts', () => {
            const text = "198.51.100.1\n1.1.1.1";
            const result = parseExPingText(text);
            expect(result).toEqual([
                { host: "198.51.100.1", remarks: "" },
                { host: "1.1.1.1", remarks: "" }
            ]);
        });

        it('should parse host with remarks', () => {
            const text = "198.51.100.1 Google DNS\n1.1.1.1 Cloudflare";
            const result = parseExPingText(text);
            expect(result).toEqual([
                { host: "198.51.100.1", remarks: "Google DNS" },
                { host: "1.1.1.1", remarks: "Cloudflare" }
            ]);
        });

        it('should ignore empty lines and comments', () => {
            const text = "\n198.51.100.1\n'Comment\n‘Japanese Comment\n  \n1.1.1.1";
            const result = parseExPingText(text);
            expect(result).toEqual([
                { host: "198.51.100.1", remarks: "" },
                { host: "1.1.1.1", remarks: "" }
            ]);
        });
    });

    describe('updateTargetStats', () => {
        it('should initialize stats for new target', () => {
            const prevStats: Record<string, TargetStats> = {};
            const newResults: PingResult[] = [{
                status: "OK (64 bytes)",
                timestamp: "2024-01-01 12:00:00",
                target: "198.51.100.1",
                ip: "198.51.100.1",
                time_ms: 10.5,
                remarks: ""
            }];
            const result = updateTargetStats(prevStats, newResults);
            expect(result["198.51.100.1"]).toMatchObject({
                executedCount: 1,
                successCount: 1,
                failedCount: 0,
                minTime: 10.5,
                maxTime: 10.5,
                avgTime: 10.5
            });
        });

        it('should update existing stats', () => {
            const prevStats: Record<string, TargetStats> = {
                "198.51.100.1": {
                    target: "198.51.100.1",
                    executedCount: 1,
                    successCount: 1,
                    failedCount: 0,
                    minTime: 10,
                    maxTime: 10,
                    avgTime: 10,
                    totalTime: 10,
                    isLastFailed: false
                }
            };
            const newResults: PingResult[] = [
                {
                    status: "OK (64 bytes)",
                    timestamp: "2024-01-01 12:00:01",
                    target: "198.51.100.1",
                    ip: "198.51.100.1",
                    time_ms: 20,
                    remarks: ""
                },
                {
                    status: "Request Timeout",
                    timestamp: "2024-01-01 12:00:02",
                    target: "198.51.100.1",
                    ip: "198.51.100.1",
                    time_ms: null,
                    remarks: ""
                }
            ];
            const result = updateTargetStats(prevStats, newResults);
            expect(result["198.51.100.1"]).toMatchObject({
                executedCount: 3,
                successCount: 2,
                failedCount: 1,
                minTime: 10,
                maxTime: 20,
                avgTime: 15,
                isLastFailed: true
            });
        });
    });

    describe('checkNgConditions', () => {
        const defaultSettings: Settings = {
            ng: {
                showPopup: true,
                notUntilCountReached: true,
                countToNotify: 3,
                onceOnly: false,
                countConsecutiveOnly: true,
            }
        } as Settings;

        it('should increment consecutiveCount on failure', () => {
            const prevNgStats = {};
            const results: PingResult[] = [{
                status: "Timeout",
                timestamp: "...",
                target: "198.51.100.1",
                ip: "198.51.100.1",
                time_ms: null,
                remarks: ""
            }];
            const { nextStats, alertToTrigger } = checkNgConditions(prevNgStats, results, defaultSettings);
            expect(nextStats["198.51.100.1"].consecutiveCount).toBe(1);
            expect(alertToTrigger).toBeNull();
        });

        it('should trigger alert when threshold is reached', () => {
            const prevNgStats = { "198.51.100.1": { consecutiveCount: 2, alerted: false } };
            const results: PingResult[] = [{
                status: "Timeout",
                timestamp: "2024-01-01 12:00:00",
                target: "198.51.100.1",
                ip: "198.51.100.1",
                time_ms: null,
                remarks: ""
            }];
            const { nextStats, alertToTrigger } = checkNgConditions(prevNgStats, results, defaultSettings);
            expect(nextStats["198.51.100.1"].consecutiveCount).toBe(3);
            expect(alertToTrigger).not.toBeNull();
            expect(alertToTrigger?.target).toBe("198.51.100.1");
        });

        it('should reset consecutiveCount on success', () => {
            const prevNgStats = { "198.51.100.1": { consecutiveCount: 5, alerted: true } };
            const results: PingResult[] = [{
                status: "OK",
                timestamp: "...",
                target: "198.51.100.1",
                ip: "198.51.100.1",
                time_ms: 10,
                remarks: ""
            }];
            const { nextStats } = checkNgConditions(prevNgStats, results, defaultSettings);
            expect(nextStats["198.51.100.1"].consecutiveCount).toBe(0);
            expect(nextStats["198.51.100.1"].alerted).toBe(false);
        });

        it('should trigger repeated alerts when onceOnly is false and notIfPreviousNg is false', () => {
            const settings = {
                ng: {
                    showPopup: true,
                    notUntilCountReached: true,
                    countToNotify: 1,
                    onceOnly: false,
                    notIfPreviousNg: false
                }
            } as Settings;
            const prevNgStats = { "198.51.100.1": { consecutiveCount: 1, alerted: true } };
            const results: PingResult[] = [{
                status: "Timeout",
                timestamp: "...",
                target: "198.51.100.1",
                ip: "198.51.100.1",
                time_ms: null,
                remarks: ""
            }];
            const { alertToTrigger } = checkNgConditions(prevNgStats, results, settings);
            expect(alertToTrigger).not.toBeNull();
        });

        it('should NOT trigger repeated alerts when onceOnly is false and notIfPreviousNg is true', () => {
            const settings = {
                ng: {
                    showPopup: true,
                    notUntilCountReached: true,
                    countToNotify: 1,
                    onceOnly: false,
                    notIfPreviousNg: true
                }
            } as Settings;
            const prevNgStats = { "198.51.100.1": { consecutiveCount: 1, alerted: true } };
            const results: PingResult[] = [{
                status: "Timeout",
                timestamp: "...",
                target: "198.51.100.1",
                ip: "198.51.100.1",
                time_ms: null,
                remarks: ""
            }];
            const { alertToTrigger } = checkNgConditions(prevNgStats, results, settings);
            expect(alertToTrigger).toBeNull();
        });

        it('should NOT trigger repeated alerts when onceOnly is true', () => {
            const settings = {
                ng: {
                    showPopup: true,
                    notUntilCountReached: true,
                    countToNotify: 1,
                    onceOnly: true,
                    notIfPreviousNg: false
                }
            } as Settings;
            const prevNgStats = { "198.51.100.1": { consecutiveCount: 1, alerted: true } };
            const results: PingResult[] = [{
                status: "Timeout",
                timestamp: "...",
                target: "198.51.100.1",
                ip: "198.51.100.1",
                time_ms: null,
                remarks: ""
            }];
            const { alertToTrigger } = checkNgConditions(prevNgStats, results, settings);
            expect(alertToTrigger).toBeNull();
        });

        it('should keep count on success when countConsecutiveOnly is false', () => {
            const settings = {
                ng: {
                    showPopup: true,
                    notUntilCountReached: true,
                    countToNotify: 3,
                    countConsecutiveOnly: false,
                }
            } as Settings;
            const prevNgStats = { "198.51.100.1": { consecutiveCount: 2, alerted: false } };
            const results: PingResult[] = [{
                status: "OK",
                timestamp: "...",
                target: "198.51.100.1",
                ip: "198.51.100.1",
                time_ms: 10,
                remarks: ""
            }];
            const { nextStats } = checkNgConditions(prevNgStats, results, settings);
            expect(nextStats["198.51.100.1"].consecutiveCount).toBe(2);
        });

        it('should increment non-consecutive count and trigger alert', () => {
            const settings = {
                ng: {
                    showPopup: true,
                    notUntilCountReached: true,
                    countToNotify: 3,
                    countConsecutiveOnly: false,
                }
            } as Settings;
            // 2 NGs already happened, and we are currently OK (count stays 2)
            const prevNgStats = { "198.51.100.1": { consecutiveCount: 2, alerted: false } };
            const results: PingResult[] = [{
                status: "Timeout",
                timestamp: "...",
                target: "198.51.100.1",
                ip: "198.51.100.1",
                time_ms: null,
                remarks: ""
            }];
            const { nextStats, alertToTrigger } = checkNgConditions(prevNgStats, results, settings);
            expect(nextStats["198.51.100.1"].consecutiveCount).toBe(3);
            expect(alertToTrigger).not.toBeNull();
        });

        it('should trigger alert even if showPopup is false', () => {
            const settings = {
                ng: {
                    showPopup: false,
                    notUntilCountReached: false,
                    onceOnly: false,
                }
            } as Settings;
            const prevNgStats = {};
            const results: PingResult[] = [{
                status: "Timeout",
                timestamp: "...",
                target: "198.51.100.1",
                ip: "198.51.100.1",
                time_ms: null,
                remarks: ""
            }];
            const { alertToTrigger } = checkNgConditions(prevNgStats, results, settings);
            expect(alertToTrigger).not.toBeNull();
        });
    });

    describe('checkOkConditions', () => {
        const defaultSettings = {
            ok: {
                showPopup: true,
                notIfPreviousOk: true,
                playSound: true,
            }
        } as Settings;

        it('should trigger OK alert when coming from first success', () => {
            const prevOkStats = {};
            const results: PingResult[] = [{
                status: "OK",
                timestamp: "2024-01-01 12:00:00",
                target: "198.51.100.1",
                ip: "198.51.100.1",
                time_ms: 10,
                remarks: ""
            }];
            const { alertToTrigger, nextStats } = checkOkConditions(prevOkStats, results, defaultSettings);
            expect(alertToTrigger).not.toBeNull();
            expect(nextStats["198.51.100.1"].consecutiveCount).toBe(1);
        });

        it('should NOT trigger OK alert if notIfPreviousOk is true and previous was OK', () => {
            const prevOkStats = { "198.51.100.1": { consecutiveCount: 1, alerted: true } };
            const results: PingResult[] = [{
                status: "OK",
                timestamp: "2024-01-01 12:00:00",
                target: "198.51.100.1",
                ip: "198.51.100.1",
                time_ms: 10,
                remarks: ""
            }];
            const { alertToTrigger } = checkOkConditions(prevOkStats, results, defaultSettings);
            expect(alertToTrigger).toBeNull();
        });

        it('should trigger alert even if showPopup is false', () => {
            const settings = {
                ok: {
                    showPopup: false,
                    notIfPreviousOk: false,
                }
            } as Settings;
            const prevOkStats = {};
            const results: PingResult[] = [{
                status: "OK",
                timestamp: "2024-01-01 12:00:00",
                target: "198.51.100.1",
                ip: "198.51.100.1",
                time_ms: 10,
                remarks: ""
            }];
            const { alertToTrigger } = checkOkConditions(prevOkStats, results, settings);
            expect(alertToTrigger).not.toBeNull();
        });
    });

    describe('formatPingResultsCsvRows', () => {
        it('should format OK and NG results correctly', () => {
            const results: PingResult[] = [
                { status: "OK (64 bytes)", timestamp: "T1", target: "198.51.100.1", ip: "198.51.100.1", time_ms: 10.55, remarks: "R1" },
                { status: "Timeout", timestamp: "T2", target: "198.51.100.1", ip: "198.51.100.1", time_ms: null, remarks: "R1" }
            ];
            const result = formatPingResultsCsvRows(results);
            expect(result).toBe("OK,T1,198.51.100.1,198.51.100.1,10.55,OK (64 bytes),R1\nNG,T2,198.51.100.1,198.51.100.1,-,Timeout,R1");
        });
    });

    describe('formatStatsCsvRows', () => {
        it('should format statistics correctly', () => {
            const targets: Target[] = [{ host: "198.51.100.1", remarks: "" }];
            const stats: Record<string, TargetStats> = {
                "198.51.100.1": {
                    target: "198.51.100.1",
                    executedCount: 10,
                    successCount: 9,
                    failedCount: 1,
                    minTime: 5,
                    maxTime: 15,
                    avgTime: 10,
                    totalTime: 90,
                    isLastFailed: false
                }
            };
            const result = formatStatsCsvRows(targets, stats);
            expect(result).toBe("198.51.100.1,10,1,10.0,5.00,15.00,10.00");
        });
    });

    describe('formatTraceResultsText', () => {
        it('should format trace result correctly', () => {
            const traceResults: TraceResult[] = [{
                target: "198.51.100.1",
                timestamp: "T1",
                ping_ok: true,
                hops: [
                    { target: "198.51.100.1", ttl: 1, ip: "192.0.2.1", time_ms: 1.23 }
                ]
            }];
            const result = formatTraceResultsText(traceResults);
            expect(result).toContain("Target: 198.51.100.1 (T1)");
            expect(result).toContain("Ping: OK");
            expect(result).toContain("1\t192.0.2.1\t1.23ms");
        });
    });
});
