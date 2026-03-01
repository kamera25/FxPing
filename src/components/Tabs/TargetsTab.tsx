import React, { useMemo } from 'react';
import styles from './TargetsTab.module.css';
import { isValidHost } from '../../utils/logic';
import { useTargetStore } from '../../store/targetStore';
import { useTargets } from '../../hooks/useTargets';
import { usePingStore } from '../../store/pingStore';

const TargetsTab: React.FC = () => {
    const {
        targets,
        newTarget, setNewTarget,
        newRemarks, setNewRemarks,
        isInputError,
        showExPingInput, setShowExPingInput,
        exPingText, setExPingText,
        toggleTargetEnabled,
        setAllTargetsEnabled,
        setTargetsEnabledByStats,
        invertTargetsEnabled
    } = useTargetStore();

    const { targetStats } = usePingStore();

    const {
        addTarget,
        removeTarget,
        handleExPingApply,
        handleTargetListDrop,
        handleDrop
    } = useTargets();

    const isHostValid = useMemo(() => !newTarget || isValidHost(newTarget), [newTarget]);

    // Check if any line in exPingText is invalid (ignoring comments)
    const isExPingValid = useMemo(() => {
        if (!exPingText) return true;
        const lines = exPingText.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("‘") || trimmed.startsWith("'")) continue;
            let host = trimmed;
            if (trimmed.includes(" ")) {
                host = trimmed.slice(0, trimmed.indexOf(" ")).trim();
            }
            if (host && !isValidHost(host)) return false;
        }
        return true;
    }, [exPingText]);
    return (
        <div
            className={styles.targetList}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => e.preventDefault()}
            onDrop={handleTargetListDrop}
        >
            <div style={{ padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', backgroundColor: 'var(--bg-secondary, #2A2A2A)', borderBottom: '1px solid var(--border-color, #444)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginRight: '8px' }}>
                    <input
                        type="checkbox"
                        checked={targets.length > 0 && targets.every(t => t.isEnabled !== false)}
                        onChange={(e) => setAllTargetsEnabled(e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                </label>
                <button className={styles.btnSmall} style={{ background: '#ccccccff' }} onClick={invertTargetsEnabled}>反転</button>
                <button className={styles.btnSmall} style={{ background: '#37ec6aff' }} onClick={() => setTargetsEnabledByStats(targetStats, 'allOk')}>全部OKのみ</button>
                <button className={styles.btnSmall} style={{ background: '#12a73cff' }} onClick={() => setTargetsEnabledByStats(targetStats, 'ok1')}>OKが1回以上</button>
                <button className={styles.btnSmall} style={{ background: '#ec5b37ff' }} onClick={() => setTargetsEnabledByStats(targetStats, 'ng1')}>NGが1回以上</button>
                <button className={styles.btnSmall} style={{ background: '#a71212ff', color: '#ffffff' }} onClick={() => setTargetsEnabledByStats(targetStats, 'allNg')}>全部NGのみ</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
                {targets.map(t => (
                    <div key={t.host} className={styles.targetItem}>
                        <input
                            type="checkbox"
                            checked={t.isEnabled !== false}
                            onChange={() => toggleTargetEnabled(t.host)}
                            style={{ marginRight: '12px', cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }}
                        />
                        <div className={styles.targetInfo}>
                            <span className={styles.hostText}>{t.host}</span>
                            <span className={styles.remarksText}>{t.remarks}</span>
                        </div>
                        <div className={styles.targetActions}>
                            <button className={`${styles.btnSmall} ${styles.btnDanger}`} onClick={() => removeTarget(t.host)}>削除</button>
                        </div>
                    </div>
                ))}
            </div>
            <div className={`${styles.toolbar} ${isInputError ? styles.shake : ''}`}>
                <div className={styles.inputGroup}>
                    <div className={styles.inputRow}>
                        <input
                            type="text"
                            className={`${(isInputError || !isHostValid) ? styles.inputError : ''} ${styles.inputHost}`}
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
                            className={`${styles.expingTextarea} ${!isExPingValid ? styles.inputError : ''}`}
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
