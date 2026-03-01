import React from 'react';
import { formatDate } from '../utils/date';
import styles from './StatsBar.module.css';

import { useTargetStore } from '../store/targetStore';
import { usePingStore } from '../store/pingStore';
import { useUIStore } from '../store/uiStore';

const StatsBar: React.FC = () => {
    const { targets } = useTargetStore();
    const { results, nextPingTimeMs } = usePingStore();
    const { currentTime } = useUIStore();

    const targetCount = targets.length;
    const resultCount = results.length;
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
