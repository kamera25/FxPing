import React, { RefObject, useState } from 'react';
import { PingResult } from '../../types';

type TableSize = 'xsmall' | 'small' | 'medium' | 'large';

interface ResultsTabProps {
    isPinging: boolean;
    setIsPinging: (pinging: boolean) => void;
    results: PingResult[];
    setResults: (results: PingResult[]) => void;
    setTargetStats: (stats: any) => void;
    scrollRef: RefObject<HTMLDivElement | null>;
    handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

const ResultRow = React.memo(({ res }: { res: PingResult }) => (
    <tr>
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
));

const ResultsTab: React.FC<ResultsTabProps> = ({
    isPinging,
    setIsPinging,
    results,
    setResults,
    setTargetStats,
    scrollRef,
    handleScroll
}) => {
    const [tableSize, setTableSize] = useState<TableSize>('medium');

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

                <div className="size-selector">
                    <button
                        className={`size-btn ${tableSize === 'xsmall' ? 'active' : ''}`}
                        onClick={() => setTableSize('xsmall')}
                    >
                        小
                    </button>
                    <button
                        className={`size-btn ${tableSize === 'medium' ? 'active' : ''}`}
                        onClick={() => setTableSize('medium')}
                    >
                        中
                    </button>
                    <button
                        className={`size-btn ${tableSize === 'large' ? 'active' : ''}`}
                        onClick={() => setTableSize('large')}
                    >
                        大
                    </button>
                </div>
            </div>

            <div className={`table-container table-${tableSize}`} ref={scrollRef} onScroll={handleScroll}>
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
                            <ResultRow key={i} res={res} />
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default ResultsTab;
