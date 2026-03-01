import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useTraceStore } from '../../store/traceStore';
import { useUIStore } from '../../store/uiStore';
import { TableSize } from '../../types';
import styles from './TraceRouteTab.module.css';

import { invoke } from '@tauri-apps/api/core';
import { TraceResult } from '../../types';
import { useTargetStore } from '../../store/targetStore';
import { useSettingsStore } from '../../store/settingsStore';
const TraceRouteTab: React.FC = () => {
    const { traceResults, setTraceResults, isTracing, traceProtocol } = useTraceStore();
    const { tableSize, setTableSize } = useUIStore();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);

    const { targets } = useTargetStore();
    const { settings } = useSettingsStore();

    const runTraceRoute = async () => {
        useTraceStore.getState().setIsTracing(true);
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
        useTraceStore.getState().setIsTracing(false);
    };

    const onProtocolChange = async (proto: 'ICMP' | 'UDP') => {
        if (proto === 'UDP') {
            const platform = await invoke<string>("get_platform");
            if (platform === 'windows') {
                const admin = await invoke<boolean>("is_admin");
                if (!admin) {
                    alert("Windows UDP Traceroute実行には管理者権限が必要です。管理者権限で実行してください。");
                    return;
                }
            }
        }
        useTraceStore.getState().setTraceProtocol(proto);
    };

    const checkScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (container) {
            const { scrollLeft, scrollWidth, clientWidth } = container;
            setShowLeftArrow(scrollLeft > 5);
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5);
        }
    }, []);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (container) {
            checkScroll();
            container.addEventListener('scroll', checkScroll);
            window.addEventListener('resize', checkScroll);

            const observer = new ResizeObserver(checkScroll);
            observer.observe(container);

            return () => {
                container.removeEventListener('scroll', checkScroll);
                window.removeEventListener('resize', checkScroll);
                observer.disconnect();
            };
        }
    }, [checkScroll, traceResults]);

    const scrollHops = (direction: 'left' | 'right') => {
        const container = scrollContainerRef.current;
        if (container) {
            const scrollAmount = direction === 'left' ? -500 : 500;
            container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    const sizeClass = tableSize === 'xsmall' ? styles.tableXsmall :
        tableSize === 'medium' ? styles.tableMedium :
            styles.tableLarge;

    return (
        <>
            <div className={styles.toolbar}>
                <button
                    onClick={runTraceRoute}
                    disabled={isTracing}
                    style={{ background: isTracing ? '#555' : 'var(--primary)', minWidth: '120px' }}
                >
                    {isTracing ? "追跡中..." : "▶ TraceRoute 開始"}
                </button>

                <div className={styles.inputGroup}>
                    <span className={styles.label}>プロトコル:</span>
                    <select
                        className={styles.select}
                        value={traceProtocol}
                        onChange={(e) => onProtocolChange(e.target.value as 'ICMP' | 'UDP')}
                        disabled={isTracing}
                    >
                        <option value="ICMP">ICMP</option>
                        <option value="UDP">UDP</option>
                    </select>
                </div>

                <button onClick={() => setTraceResults([])}>履歴クリア</button>

                <div className={styles.sizeSelector}>
                    <button
                        className={`${styles.sizeBtn} ${tableSize === 'xsmall' ? styles.active : ''}`}
                        onClick={() => setTableSize('xsmall')}
                    >
                        小
                    </button>
                    <button
                        className={`${styles.sizeBtn} ${tableSize === 'medium' ? styles.active : ''}`}
                        onClick={() => setTableSize('medium')}
                    >
                        中
                    </button>
                    <button
                        className={`${styles.sizeBtn} ${tableSize === 'large' ? styles.active : ''}`}
                        onClick={() => setTableSize('large')}
                    >
                        大
                    </button>
                </div>
            </div>

            <div className={styles.mainContainer}>
                {showLeftArrow && (
                    <div
                        className={`${styles.scrollArrow} ${styles.leftArrow}`}
                        onClick={() => scrollHops('left')}
                        title="左にスクロール"
                    >
                        <span>‹</span>
                    </div>
                )}

                {showRightArrow && (
                    <div
                        className={`${styles.scrollArrow} ${styles.rightArrow}`}
                        onClick={() => scrollHops('right')}
                        title="右にスクロール"
                    >
                        <span>›</span>
                    </div>
                )}

                <div
                    ref={scrollContainerRef}
                    className={`${styles.tableContainer} ${sizeClass}`}
                >
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.stickyColumn} style={{
                                    width: tableSize === 'xsmall' ? '100px' : '150px',
                                }}>対象ホスト</th>
                                <th style={{ width: tableSize === 'xsmall' ? '40px' : '80px' }}>Ping</th>
                                {(() => {
                                    const maxHopsFound = Math.max(0, ...traceResults.map(r => r.hops.length));
                                    return Array.from({ length: Math.max(1, maxHopsFound) }).map((_, i) => (
                                        <th key={i} style={{ width: tableSize === 'xsmall' ? '100px' : '150px' }}>Hop {i + 1}</th>
                                    ));
                                })()}
                            </tr>
                        </thead>
                        <tbody>
                            {traceResults.map((res, i) => {
                                const maxHopsFound = Math.max(0, ...traceResults.map(r => r.hops.length));
                                return (
                                    <tr key={i}>
                                        <td className={styles.stickyColumn}>{res.target}</td>
                                        <td
                                            className={res.ping_ok === null ? styles.statusPending : (res.ping_ok ? styles.statusOk : styles.statusNg)}
                                        >
                                            {res.ping_ok === null ? "実行中" : (res.ping_ok ? "OK" : "NG")}
                                        </td>
                                        {Array.from({ length: Math.max(1, maxHopsFound) }).map((_, j) => {
                                            const hop = res.hops[j];
                                            return (
                                                <td key={j} style={{ fontSize: tableSize === 'xsmall' ? '9px' : '11px' }}>
                                                    {hop ? (
                                                        <>
                                                            <div className={`${styles.hopIp} ${hop.ip === "*" ? styles.hopIpLost : ""}`}>{hop.ip}</div>
                                                            {hop.fqdn && tableSize !== 'xsmall' && <div className={styles.hopFqdn}>{hop.fqdn}</div>}
                                                            <div className={styles.hopTime}>{hop.time_ms !== null ? `${hop.time_ms.toFixed(1)}ms` : "-"}</div>
                                                        </>
                                                    ) : "-"}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                            {traceResults.length === 0 && (
                                <tr>
                                    <td colSpan={3} className={styles.emptyMessage}>
                                        TraceRouteを実行するには「開始」ボタンを押してください
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default TraceRouteTab;
