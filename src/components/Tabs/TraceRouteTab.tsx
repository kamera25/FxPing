import React from 'react';
import { TraceResult } from '../../types';

interface TraceRouteTabProps {
    runTraceRoute: () => Promise<void>;
    isTracing: boolean;
    traceProtocol: 'ICMP' | 'UDP';
    onProtocolChange: (proto: 'ICMP' | 'UDP') => Promise<void>;
    traceResults: TraceResult[];
    setTraceResults: (results: TraceResult[]) => void;
}

const TraceRouteTab: React.FC<TraceRouteTabProps> = ({
    runTraceRoute,
    isTracing,
    traceProtocol,
    onProtocolChange,
    traceResults,
    setTraceResults
}) => {
    return (
        <>
            <div className="toolbar" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                    onClick={runTraceRoute}
                    disabled={isTracing}
                    style={{ background: isTracing ? '#555' : 'var(--primary)', minWidth: '120px' }}
                >
                    {isTracing ? "追跡中..." : "▶ TraceRoute 開始"}
                </button>

                <div className="input-group" style={{ width: 'auto' }}>
                    <span style={{ fontSize: '12px', opacity: 0.7 }}>プロトコル:</span>
                    <select
                        value={traceProtocol}
                        onChange={(e) => onProtocolChange(e.target.value as 'ICMP' | 'UDP')}
                        disabled={isTracing}
                        style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: 'var(--bg-secondary)',
                            color: 'white',
                            border: '1px solid var(--border)'
                        }}
                    >
                        <option value="ICMP">ICMP</option>
                        <option value="UDP">UDP</option>
                    </select>
                </div>

                <button onClick={() => setTraceResults([])}>履歴クリア</button>
            </div>

            <div className="table-container" style={{ overflowX: 'auto', maxWidth: '100%' }}>
                <table style={{ minWidth: 'max-content', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '150px', position: 'sticky', left: 0, background: 'var(--bg-secondary)', zIndex: 2 }}>対象ホスト</th>
                            <th style={{ width: '80px', position: 'sticky', left: '150px', background: 'var(--bg-secondary)', zIndex: 2 }}>Ping</th>
                            {(() => {
                                const maxHopsFound = Math.max(0, ...traceResults.map(r => r.hops.length));
                                return Array.from({ length: Math.max(1, maxHopsFound) }).map((_, i) => (
                                    <th key={i} style={{ width: '150px' }}>Hop {i + 1}</th>
                                ));
                            })()}
                        </tr>
                    </thead>
                    <tbody>
                        {traceResults.map((res, i) => {
                            const maxHopsFound = Math.max(0, ...traceResults.map(r => r.hops.length));
                            return (
                                <tr key={i}>
                                    <td style={{ position: 'sticky', left: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>{res.target}</td>
                                    <td
                                        className={res.ping_ok === null ? "status-pending" : (res.ping_ok ? "status-ok" : "status-ng")}
                                        style={{ position: 'sticky', left: '150px', background: 'var(--bg-secondary)', zIndex: 1 }}
                                    >
                                        {res.ping_ok === null ? "実行中" : (res.ping_ok ? "OK" : "NG")}
                                    </td>
                                    {Array.from({ length: Math.max(1, maxHopsFound) }).map((_, j) => {
                                        const hop = res.hops[j];
                                        return (
                                            <td key={j} style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                                                {hop ? (
                                                    <>
                                                        <div style={{ fontWeight: 'bold', color: hop.ip === "*" ? "#ff4d4d" : "inherit" }}>{hop.ip}</div>
                                                        {hop.fqdn && <div style={{ opacity: 0.8, color: 'var(--primary)', fontStyle: 'italic' }}>{hop.fqdn}</div>}
                                                        <div style={{ opacity: 0.6 }}>{hop.time_ms !== null ? `${hop.time_ms.toFixed(1)}ms` : "-"}</div>
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
                                <td colSpan={3} style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                                    TraceRouteを実行するには「開始」ボタンを押してください
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default TraceRouteTab;
