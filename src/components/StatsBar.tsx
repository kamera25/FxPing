import React from 'react';
import { formatDate } from '../utils/date';
import styles from './StatsBar.module.css';

interface StatsBarProps {
    targetCount: number;
    resultCount: number;
    currentTime: Date;
    nextPingTimeMs: number | null;
    repeatMode: 'parallel' | 'sequential' | 'robin';
}

const StatsBar: React.FC<StatsBarProps> = ({
    targetCount,
    resultCount,
    currentTime,
    nextPingTimeMs
}) => {
    const showCountdown = nextPingTimeMs !== null;

    return (
        <div className={styles.statsBar}>
            <div>対象数: {targetCount}</div>
            <div>パケット合計: {resultCount}</div>
            {showCountdown && (
                <div className={styles.countdown}>
                    次のPing: {Math.ceil(nextPingTimeMs / 1000)}秒
                </div>
            )}
            <div className={styles.time}>
                {formatDate(currentTime)}
            </div>
        </div>
    );
};

export default StatsBar;
