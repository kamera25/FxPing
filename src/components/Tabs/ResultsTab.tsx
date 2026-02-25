import React, { RefObject } from 'react';
import { PingResult } from '../../types';

interface ResultsTabProps {
    isPinging: boolean;
    setIsPinging: (pinging: boolean) => void;
    results: PingResult[];
    setResults: (results: PingResult[]) => void;
    setTargetStats: (stats: any) => void;
    scrollRef: RefObject<HTMLDivElement | null>;
    handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

const ResultsTab: React.FC<ResultsTabProps> = ({
    isPinging,
    setIsPinging,
    results,
    setResults,
    setTargetStats,
    scrollRef,
    handleScroll
}) => {
    return (
        <>
            <div className="toolbar">
                <button
                    onClick={() => setIsPinging(!isPinging)}
                    style={{ background: isPinging ? '#cf6679' : '#4caf50', minWidth: '100px' }}
                >
                    {isPinging ? "■ 停止" : "▶ 開始"}
                </button>
                <button onClick={() => { setResults([]); setTargetStats({}); }}>履歴クリア</button>
            </div>

            <div className="table-container" ref={scrollRef} onScroll={handleScroll}>
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '80px' }}>ステータス</th>
                            <th style={{ width: '180px' }}>日時</th>
                            <th>対象</th>
                            <th>IPアドレス</th>
                            <th>応答時間</th>
                            <th>詳細</th>
                            <th>備考</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((res, i) => (
                            <tr key={i}>
                                <td className={res.status.startsWith("OK") ? "status-ok" : "status-ng"}>
                                    {res.status.startsWith("OK") ? "● OK" : "✖ NG"}
                                </td>
                                <td>{res.timestamp}</td>
                                <td>{res.target}</td>
                                <td>{res.ip}</td>
                                <td>{res.time_ms !== null ? `${res.time_ms.toFixed(2)} ms` : "-"}</td>
                                <td style={{ opacity: 0.6, fontSize: '12px' }}>{res.status}</td>
                                <td>{res.remarks}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default ResultsTab;
