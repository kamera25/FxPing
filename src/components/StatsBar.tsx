import React from 'react';
import { formatDate } from '../utils/date';

interface StatsBarProps {
    targetCount: number;
    resultCount: number;
    currentTime: Date;
}

const StatsBar: React.FC<StatsBarProps> = ({ targetCount, resultCount, currentTime }) => {
    return (
        <div className="stats-bar">
            <div>対象数: {targetCount}</div>
            <div>パケット合計: {resultCount}</div>
            <div style={{ flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {formatDate(currentTime)}
            </div>
        </div>
    );
};

export default StatsBar;
