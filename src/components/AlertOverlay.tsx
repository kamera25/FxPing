import React from 'react';

interface AlertOverlayProps {
    activeAlert: { target: string, timestamp: string, reason: string } | null;
    setActiveAlert: (alert: { target: string, timestamp: string, reason: string } | null) => void;
}

const AlertOverlay: React.FC<AlertOverlayProps> = ({ activeAlert, setActiveAlert }) => {
    if (!activeAlert) return null;

    return (
        <div className="alert-overlay">
            <div className="alert-box modern">
                <div className="alert-header">
                    <span className="alert-icon">⚠️</span>
                    <span className="alert-title">NG 発生通知</span>
                    <button className="alert-close-x" onClick={() => setActiveAlert(null)}>✕</button>
                </div>
                <div className="alert-body">
                    <div className="alert-main-icon pulse">
                        <svg viewBox="0 0 24 24" width="64" height="64" fill="var(--error)">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                    </div>
                    <div className="alert-content">
                        <div className="alert-message">以下のターゲットで異常を検知しました</div>
                        <div className="alert-details">
                            <div className="alert-detail-row">
                                <span className="label">日時</span>
                                <span className="value">{activeAlert.timestamp}</span>
                            </div>
                            <div className="alert-detail-row">
                                <span className="label">対象</span>
                                <span className="value">{activeAlert.target}</span>
                            </div>
                            <div className="alert-detail-row">
                                <span className="label">理由</span>
                                <span className="value error-text">{activeAlert.reason}</span>
                            </div>
                        </div>
                    </div>
                    <div className="alert-actions">
                        <button className="alert-ok-button" onClick={() => setActiveAlert(null)}>閉じる</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AlertOverlay;
