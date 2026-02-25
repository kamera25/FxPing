import React from 'react';
import { Target } from '../../types';

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
            className="target-list"
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => e.preventDefault()}
            onDrop={handleTargetListDrop}
            style={{ minHeight: '300px' }}
        >
            <div className={`toolbar ${isInputError ? 'shake-animation' : ''}`} style={{ margin: '0 0 16px 0', borderRadius: '4px' }}>
                <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            className={isInputError ? 'input-error' : ''}
                            style={{ flex: 2 }}
                            placeholder="IPアドレスまたはホスト名..."
                            value={newTarget}
                            onChange={(e) => setNewTarget(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addTarget()}
                        />
                        <input
                            type="text"
                            style={{ flex: 1 }}
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
                <div key={t.host} className="target-item">
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', minWidth: '120px' }}>{t.host}</span>
                        <span style={{ opacity: 0.7, fontSize: '0.9em' }}>{t.remarks}</span>
                    </div>
                    <div className="target-actions">
                        <button className="btn-small btn-danger" onClick={() => removeTarget(t.host)}>削除</button>
                    </div>
                </div>
            ))}

            <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                {!showExPingInput ? (
                    <button
                        className="btn-full"
                        style={{ width: '100%', background: 'rgba(255, 255, 255, 0.73)', border: '1px dashed rgba(255,255,255,0.2)' }}
                        onClick={() => setShowExPingInput(true)}
                    >
                        ExPing形式で定義…
                    </button>
                ) : (
                    <div className="exping-input-area">
                        <div style={{ marginBottom: '8px', fontSize: '12px', opacity: 0.7 }}>
                            ExPing形式で入力 (既存の定義を上書き)
                        </div>
                        <textarea
                            style={{
                                width: '100%',
                                height: '120px',
                                background: 'rgba(0,0,0,0.2)',
                                color: 'white',
                                border: '1px solid var(--primary)',
                                borderRadius: '4px',
                                padding: '8px',
                                fontSize: '13px',
                                fontFamily: 'monospace',
                                resize: 'vertical'
                            }}
                            placeholder="'監視対象 サーバ群&#10;localhost 自機 1&#10;8.8.8.8 Google_Public_DNS#1"
                            value={exPingText}
                            onChange={(e) => setExPingText(e.target.value)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                        />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <button style={{ flex: 1 }} onClick={handleExPingApply}>適応</button>
                            <button
                                style={{ flex: 1, background: 'rgba(255, 255, 255, 0.46)' }}
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
