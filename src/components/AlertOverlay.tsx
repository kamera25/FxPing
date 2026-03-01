import React from 'react';
import styles from './AlertOverlay.module.css';

import { useAlertStore } from '../store/alertStore';

const AlertOverlay: React.FC = () => {
    const { activeAlert, setActiveAlert } = useAlertStore();
    if (!activeAlert) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.box}>
                <div className={styles.header}>
                    <span className={styles.icon}>⚠️</span>
                    <span className={styles.title}>NG 発生通知</span>
                    <button className={styles.closeX} onClick={() => setActiveAlert(null)}>✕</button>
                </div>
                <div className={styles.body}>
                    <div className={`${styles.mainIcon} ${styles.pulse}`}>
                        <svg viewBox="0 0 24 24" width="64" height="64" fill="var(--error)">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                    </div>
                    <div className={styles.content}>
                        <div className={styles.message}>以下のターゲットで異常を検知しました</div>
                        <div className={styles.details}>
                            <div className={styles.detailRow}>
                                <span className={styles.label}>日時</span>
                                <span className={styles.value}>{activeAlert.timestamp}</span>
                            </div>
                            <div className={styles.detailRow}>
                                <span className={styles.label}>対象</span>
                                <span className={styles.value}>{activeAlert.target}</span>
                            </div>
                            <div className={styles.detailRow}>
                                <span className={styles.label}>理由</span>
                                <span className={styles.value} style={{ color: 'var(--error)' }}>{activeAlert.reason}</span>
                            </div>
                        </div>
                    </div>
                    <div className={styles.actions}>
                        <button className={styles.okButton} onClick={() => setActiveAlert(null)}>閉じる</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AlertOverlay;
