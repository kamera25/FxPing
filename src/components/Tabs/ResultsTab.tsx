import React, { RefObject, useState } from 'react';
import { createPortal } from 'react-dom';

import { PingResult, TableSize } from '../../types';

interface ResultsTabProps {
    isPinging: boolean;
    setIsPinging: (pinging: boolean) => void;
    results: PingResult[];
    setResults: (results: PingResult[]) => void;
    setTargetStats: (stats: any) => void;
    scrollRef: RefObject<HTMLDivElement | null>;
    handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    tableSize: TableSize;
    setTableSize: (size: TableSize) => void;
}

const ResultRow = React.memo(({ res, tableSize }: { res: PingResult, tableSize: TableSize }) => {
    const isFailed = !res.status.startsWith("OK");
    const [showPopover, setShowPopover] = useState(false);
    const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });

    const displayTimestamp = tableSize === 'xsmall'
        ? res.timestamp.split(' ').pop() // Get HH:mm:ss
        : res.timestamp;

    const displayStatusText = tableSize === 'xsmall'
        ? (isFailed ? "NG" : "OK")
        : res.status;

    const handleMouseEnter = (e: React.MouseEvent) => {
        if (isFailed && tableSize === 'xsmall') {
            setPopoverPos({ x: e.clientX, y: e.clientY });
            setShowPopover(true);
        }
    };

    const handleMouseLeave = () => {
        setShowPopover(false);
    };

    return (
        <tr
            className={`${isFailed ? "row-failed" : ""} ${isFailed && tableSize === 'xsmall' ? "row-hoverable" : ""}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: (isFailed && tableSize === 'xsmall') ? 'help' : 'default' }}
        >
            <td className={!isFailed ? "status-ok" : "status-ng"}>
                {!isFailed ? "● OK" : "✖ NG"}
            </td>
            <td>{displayTimestamp}</td>
            <td>{res.target}</td>
            <td>{res.ip}</td>
            <td>{res.time_ms !== null ? `${res.time_ms.toFixed(2)} ms` : "-"}</td>
            <td
                style={{ opacity: 0.6, fontSize: tableSize === 'xsmall' ? '9px' : '12px', position: 'relative' }}
            >
                {displayStatusText}
                {showPopover && typeof document !== 'undefined' && createPortal(
                    <div
                        className="status-popover"
                        style={{
                            position: 'fixed',
                            left: `${popoverPos.x}px`,
                            top: `${popoverPos.y}px`,
                            bottom: 'auto',
                            transform: 'translate(-50%, -100%)',
                            marginTop: '-12px',
                            zIndex: 10000 // Ensure it's above everything
                        }}
                    >
                        <div className="popover-content">{res.status}</div>
                        <div className="popover-arrow"></div>
                    </div>,
                    document.body
                )}
            </td>
            <td>{res.remarks}</td>
        </tr>
    );
});

const ResultsTab: React.FC<ResultsTabProps> = ({
    isPinging,
    setIsPinging,
    results,
    setResults,
    setTargetStats,
    scrollRef,
    handleScroll,
    tableSize,
    setTableSize
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
                            <ResultRow key={i} res={res} tableSize={tableSize} />
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default ResultsTab;
