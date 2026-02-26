import React from 'react';
import { formatDate } from '../utils/date';

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
    nextPingTimeMs,
    repeatMode
}) => {
    // Show countdown if available. 
    // If it's parallel mode and isRepeating, we might want to hide intra-run info, 
    // but the periodic wait should probably be shown.
    // For now, let's keep it simple: show if we have a value.
    const showCountdown = nextPingTimeMs !== null;

    return (
        <div className="stats-bar">
            <div>対象数: {targetCount}</div>
            <div>パケット合計: {resultCount}</div>
            {showCountdown && (
                <div style={{ marginLeft: '15px', color: '#66d9ff' }}>
                    次のPing: {Math.ceil(nextPingTimeMs / 1000)}秒
                </div>
            )}
            <div style={{ flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {formatDate(currentTime)}
            </div>
        </div>
    );
};

export default StatsBar;
