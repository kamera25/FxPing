import React from 'react';
import { Settings } from '../../types';

interface PingSettingsProps {
    settings: Settings;
    setSettings: (settings: Settings) => void;
}

const PingSettings: React.FC<PingSettingsProps> = ({ settings, setSettings }) => {
    return (
        <div className="settings-container" style={{ padding: 0, background: 'transparent' }}>
            <div className="settings-section" style={{ maxWidth: 'none' }}>
                <h3>基本設定</h3>
                <div className="settings-grid">
                    <div className="field-group">
                        <label>繰り返し回数:</label>
                        <div className="field-row">
                            <input
                                type="number"
                                min={1}
                                max={99999}
                                value={settings.repeatCount}
                                onChange={e => {
                                    const val = Math.max(1, Math.min(99999, parseInt(e.target.value) || 1));
                                    setSettings({ ...settings, repeatCount: val });
                                }}
                                title="UIの応答性とメモリリソースを考慮した1〜99,999回の範囲"
                            />
                            <span className="unit">回</span>
                        </div>
                    </div>
                    <div className="field-group">
                        <label>実行間隔:</label>
                        <div className="field-row">
                            <input
                                type="number"
                                min={100}
                                max={60000}
                                value={settings.interval}
                                onChange={e => {
                                    const val = Math.max(100, Math.min(60000, parseInt(e.target.value) || 100));
                                    setSettings({ ...settings, interval: val });
                                }}
                                title="ICMPフラッディング（DOS攻撃と誤認されるリスク）を防止するための最小100ms制限"
                            />
                            <span className="unit">ミリ秒</span>
                        </div>
                    </div>
                    <div className="field-group">
                        <label>ブロックサイズ:</label>
                        <div className="field-row">
                            <input
                                type="number"
                                min={0}
                                max={65507}
                                value={settings.payloadSize}
                                onChange={e => {
                                    const val = Math.max(0, Math.min(65507, parseInt(e.target.value) || 0));
                                    setSettings({ ...settings, payloadSize: val });
                                }}
                                title="IPv4最大パケットサイズ(65535)からIPヘッダ(20)とICMPヘッダ(8)を差し引いた65,507バイトが最大実効ペイロードサイズ"
                            />
                            <span className="unit">バイト</span>
                        </div>
                    </div>
                    <div className="field-group">
                        <label>タイムアウト:</label>
                        <div className="field-row">
                            <input
                                type="number"
                                min={1}
                                max={300000}
                                value={settings.timeout}
                                onChange={e => {
                                    const val = Math.max(1, Math.min(300000, parseInt(e.target.value) || 1));
                                    setSettings({ ...settings, timeout: val });
                                }}
                                title="バックエンド実装の制限（Timeoutオブジェクト：最大300,000ms）に準拠。0は無効。"
                            />
                            <span className="unit">ミリ秒</span>
                        </div>
                    </div>
                    <div className="field-group">
                        <label>TTL:</label>
                        <div className="field-row">
                            <input
                                type="number"
                                min={1}
                                max={255}
                                value={settings.ttl}
                                onChange={e => {
                                    const val = Math.max(1, Math.min(255, parseInt(e.target.value) || 1));
                                    setSettings({ ...settings, ttl: val });
                                }}
                                title="IPヘッダにおけるTTLフィールドは8ビットのため、1〜255の範囲に限定"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="settings-section" style={{ maxWidth: 'none' }}>
                <h3>繰り返し順序</h3>
                <div className="radio-group">
                    <label className="checkbox-label">
                        <input type="radio" checked={settings.repeatOrder === 'sequential'} onChange={() => setSettings({ ...settings, repeatOrder: 'sequential' })} />
                        ソートしない (A-A-B-B)
                    </label>
                    <label className="checkbox-label">
                        <input type="radio" checked={settings.repeatOrder === 'robin'} onChange={() => setSettings({ ...settings, repeatOrder: 'robin' })} />
                        端末でソート (A-B-A-B)
                    </label>
                </div>
            </div>

            <div className="settings-section" style={{ maxWidth: 'none' }}>
                <label className="checkbox-label">
                    <input type="checkbox" checked={settings.periodicExecution} onChange={e => setSettings({ ...settings, periodicExecution: e.target.checked })} />
                    定期的に実行する
                </label>
                <div className="field-row" style={{ marginTop: '10px', marginLeft: '24px' }}>
                    <input type="number" disabled={!settings.periodicExecution} value={settings.periodicInterval} onChange={e => setSettings({ ...settings, periodicInterval: parseInt(e.target.value) || 0 })} />
                    <span className="unit">分間隔</span>
                </div>
            </div>
        </div>
    );
};

export default PingSettings;
