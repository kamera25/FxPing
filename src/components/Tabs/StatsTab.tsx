import React from 'react';
import { Target, TargetStats } from '../../types';
import styles from './StatsTab.module.css';

import { useTargetStore } from '../../store/targetStore';
import { usePingStore } from '../../store/pingStore';

const StatsTab: React.FC = () => {
    const { targets } = useTargetStore();
    const { targetStats } = usePingStore();
    return (
        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>対象</th>
                        <th style={{ width: '100px' }}>実施回数</th>
                        <th style={{ width: '100px' }}>失敗回数</th>
                        <th style={{ width: '100px' }}>失敗率</th>
                        <th style={{ width: '100px' }}>最短時間</th>
                        <th style={{ width: '100px' }}>最大時間</th>
                        <th style={{ width: '100px' }}>平均時間</th>
                    </tr>
                </thead>
                <tbody>
                    {targets.map(t => {
                        const target = t.host;
                        const s = targetStats[target];
                        if (!s) return (
                            <tr key={target}>
                                <td>{target}</td>
                                <td>0回</td>
                                <td>0回</td>
                                <td>0%</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                            </tr>
                        );
                        const failRate = ((s.failedCount / s.executedCount) * 100).toFixed(1);
                        const failColor = s.failedCount > 0 ? (s.isLastFailed ? '#ff4d4d' : '#ffca28') : 'inherit';
                        return (
                            <tr key={target}>
                                <td>{s.target}</td>
                                <td>{s.executedCount}回</td>
                                <td style={{ color: failColor }}>{s.failedCount}回</td>
                                <td style={{ color: failColor }}>{failRate}%</td>
                                <td>{s.minTime !== null ? `${s.minTime.toFixed(2)} ms` : "-"}</td>
                                <td>{s.maxTime !== null ? `${s.maxTime.toFixed(2)} ms` : "-"}</td>
                                <td>{s.avgTime !== null ? `${s.avgTime.toFixed(2)} ms` : "-"}</td>
                            </tr>
                        );
                    })}
                    {targets.length === 0 && (
                        <tr>
                            <td colSpan={7} className={styles.emptyMessage}>
                                対象が設定されていません
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default StatsTab;
