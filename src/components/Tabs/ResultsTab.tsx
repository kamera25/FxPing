import React, { RefObject, useState } from 'react';
import { createPortal } from 'react-dom';

import { PingResult, TableSize } from '../../types';
import styles from './ResultsTab.module.css';

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
            className={`${isFailed ? styles.rowFailed : ''}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: (isFailed && tableSize === 'xsmall') ? 'help' : 'default' }}
        >
            <td className={!isFailed ? styles.statusOk : styles.statusNg}>
                {!isFailed ? "● OK" : "✖ NG"}
            </td>
            <td>{displayTimestamp}</td>
            <td>{res.target}</td>
            <td>{res.ip || "-"}</td>
            <td>{res.time_ms !== null ? `${res.time_ms.toFixed(2)} ms` : "-"}</td>
            <td className={styles.detailsCell} style={{ fontSize: tableSize === 'xsmall' ? '9px' : '12px' }}>
                {displayStatusText}
                {showPopover && typeof document !== 'undefined' && createPortal(
                    <div
                        className={styles.popover}
                        style={{
                            left: `${popoverPos.x}px`,
                            top: `${popoverPos.y}px`,
                        }}
                    >
                        <div className={styles.popoverContent}>{res.status}</div>
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

    const sizeClass = tableSize === 'xsmall' ? styles.tableXsmall :
        tableSize === 'medium' ? styles.tableMedium :
            styles.tableLarge;

    return (
        <>
            <div className={styles.toolbar}>
                <button
                    onClick={() => setIsPinging(!isPinging)}
                    className={isPinging ? styles.btnStop : styles.btnStart}
                >
                    {isPinging ? "■ 停止" : "▶ 開始"}
                </button>
                <button onClick={() => { setResults([]); setTargetStats({}); }}>履歴クリア</button>

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

            <div className={`${styles.tableContainer} ${sizeClass}`} ref={scrollRef} onScroll={handleScroll}>
                <table className={styles.table}>
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
