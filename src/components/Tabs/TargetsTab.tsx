import React from 'react';
import { Target } from '../../types';
import styles from './TargetsTab.module.css';

interface TargetsTabProps {
    targets: Target[];
    newTarget: string;
    setNewTarget: (target: string) => void;
    newRemarks: string;
    setNewRemarks: (remarks: string) => void;
    isInputError: boolean;
    addTarget: () => void;
    removeTarget: (host: string) => void;
    showExPingInput: boolean;
    setShowExPingInput: (show: boolean) => void;
    exPingText: string;
    setExPingText: (text: string) => void;
    handleExPingApply: () => void;
    handleTargetListDrop: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent) => void;
}

const TargetsTab: React.FC<TargetsTabProps> = ({
    targets,
    newTarget,
    setNewTarget,
    newRemarks,
    setNewRemarks,
    isInputError,
    addTarget,
    removeTarget,
    showExPingInput,
    setShowExPingInput,
    exPingText,
    setExPingText,
    handleExPingApply,
    handleTargetListDrop,
    handleDrop
}) => {
    return (
        <div
            className={styles.targetList}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => e.preventDefault()}
            onDrop={handleTargetListDrop}
        >
            <div className={`${styles.toolbar} ${isInputError ? styles.shake : ''}`}>
                <div className={styles.inputGroup}>
                    <div className={styles.inputRow}>
                        <input
                            type="text"
                            className={`${isInputError ? styles.inputError : ''} ${styles.inputHost}`}
                            placeholder="IPアドレスまたはホスト名..."
                            value={newTarget}
                            onChange={(e) => setNewTarget(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addTarget()}
                        />
                        <input
                            type="text"
                            className={styles.inputRemarks}
                            placeholder="備考..."
                            value={newRemarks}
                            onChange={(e) => setNewRemarks(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addTarget()}
                        />
                        <button onClick={addTarget}>対象を追加</button>
                    </div>
                </div>
            </div>
            {targets.map(t => (
                <div key={t.host} className={styles.targetItem}>
                    <div className={styles.targetInfo}>
                        <span className={styles.hostText}>{t.host}</span>
                        <span className={styles.remarksText}>{t.remarks}</span>
                    </div>
                    <div className={styles.targetActions}>
                        <button className={`${styles.btnSmall} ${styles.btnDanger}`} onClick={() => removeTarget(t.host)}>削除</button>
                    </div>
                </div>
            ))}

            <div className={styles.expingSection}>
                {!showExPingInput ? (
                    <button
                        className={styles.btnFull}
                        onClick={() => setShowExPingInput(true)}
                    >
                        ExPing形式で定義…
                    </button>
                ) : (
                    <div className="exping-input-area">
                        <div className={styles.expingLabel}>
                            ExPing形式で入力 (既存の定義を上書き・defファイルからドロップで上書き可)
                        </div>
                        <textarea
                            className={styles.expingTextarea}
                            placeholder="'監視対象 サーバ群&#10;localhost 自機 1&#10;198.51.100.1 Google_Public_DNS#1"
                            value={exPingText}
                            onChange={(e) => setExPingText(e.target.value)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                        />
                        <div className={styles.expingActions}>
                            <button className={styles.btnApply} onClick={handleExPingApply}>適応</button>
                            <button
                                className={styles.btnCancel}
                                onClick={() => { setShowExPingInput(false); setExPingText(""); }}
                            >
                                キャンセル
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TargetsTab;
