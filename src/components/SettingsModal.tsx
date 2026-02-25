import React, { useState } from 'react';
import { Settings } from '../types';

interface SettingsModalProps {
    settings: Settings;
    setSettings: (settings: Settings) => void;
    setShowSettings: (show: boolean) => void;
    selectFile: (type: 'sound' | 'program') => Promise<void>;
    selectDir: () => Promise<void>;
    playSound: (filePath: string) => Promise<void>;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
    settings,
    setSettings,
    setShowSettings,
    selectFile,
    selectDir,
    playSound
}) => {
    const [settingsTab, setSettingsTab] = useState("general");

    return (
        <div className="settings-container" style={{ padding: 0 }}>
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)' }}>
                <h2 style={{ fontSize: '16px', color: 'var(--primary)', margin: 0 }}>設定</h2>
                <button className="btn-small" onClick={() => setShowSettings(false)}>閉じる</button>
            </div>

            <div className="settings-header-tabs">
                <div className={`settings-tab ${settingsTab === 'general' ? 'active' : ''}`} onClick={() => setSettingsTab('general')}>基本設定</div>
                <div className={`settings-tab ${settingsTab === 'ping' ? 'active' : ''}`} onClick={() => setSettingsTab('ping')}>Ping実行設定</div>
                <div className={`settings-tab ${settingsTab === 'logs' ? 'active' : ''}`} onClick={() => setSettingsTab('logs')}>ログ保存</div>
                <div className={`settings-tab ${settingsTab === 'ng' ? 'active' : ''}`} onClick={() => setSettingsTab('ng')}>NG時処理</div>
                <div className={`settings-tab ${settingsTab === 'ok' ? 'active' : ''}`} onClick={() => setSettingsTab('ok')}>OK時処理</div>
            </div>

            <div className="settings-content-body">
                {settingsTab === 'general' && (
                    <div className="settings-checkbox-grid">
                        <label className="checkbox-label">
                            <input type="checkbox" checked={settings.hideOnMinimize} onChange={e => setSettings({ ...settings, hideOnMinimize: e.target.checked })} />
                            最小化時、タスクバーに非表示
                        </label>
                        <label className="checkbox-label">
                            <input type="checkbox" checked={settings.saveSettingsOnExit} onChange={e => setSettings({ ...settings, saveSettingsOnExit: e.target.checked })} />
                            終了時に対象ファイルの環境を保存する
                        </label>
                        <label className="checkbox-label">
                            <input type="checkbox" checked={settings.saveAsCsv} onChange={e => setSettings({ ...settings, saveAsCsv: e.target.checked })} />
                            Ping 結果の保存はCSV形式
                        </label>

                        <div style={{ border: '1px solid #444', padding: '12px', borderRadius: '4px', margin: '4px 0' }}>
                            <label className="checkbox-label">
                                <input type="checkbox" checked={settings.autoDeleteResults} onChange={e => setSettings({ ...settings, autoDeleteResults: e.target.checked })} />
                                Ping 結果の自動削除
                            </label>
                            <div className="settings-auto-delete-row" style={{ opacity: settings.autoDeleteResults ? 1 : 0.5 }}>
                                <input
                                    type="number"
                                    value={settings.maxResults}
                                    disabled={!settings.autoDeleteResults}
                                    onChange={e => setSettings({ ...settings, maxResults: parseInt(e.target.value) || 0 })}
                                />
                                <span>件を超えた場合、古い結果から削除する</span>
                            </div>
                        </div>

                        <label className="checkbox-label">
                            <input type="checkbox" checked={settings.flashTrayIcon} onChange={e => setSettings({ ...settings, flashTrayIcon: e.target.checked })} />
                            Ping 実行中にトレイアイコンを点滅させる
                        </label>
                        <label className="checkbox-label">
                            <input type="checkbox" checked={settings.prohibitFragmentation} onChange={e => setSettings({ ...settings, prohibitFragmentation: e.target.checked })} />
                            パケットのフラグメントを禁止する
                        </label>
                    </div>
                )}

                {settingsTab === 'ping' && (
                    <div className="settings-container" style={{ padding: 0, background: 'transparent' }}>
                        <div className="settings-section" style={{ maxWidth: 'none' }}>
                            <h3>基本設定</h3>
                            <div className="settings-grid">
                                <div className="field-group">
                                    <label>繰り返し回数:</label>
                                    <div className="field-row">
                                        <input type="number" value={settings.repeatCount} onChange={e => setSettings({ ...settings, repeatCount: parseInt(e.target.value) || 0 })} />
                                        <span className="unit">回</span>
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label>実行間隔:</label>
                                    <div className="field-row">
                                        <input type="number" value={settings.interval} onChange={e => setSettings({ ...settings, interval: parseInt(e.target.value) || 0 })} />
                                        <span className="unit">ミリ秒</span>
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label>ブロックサイズ:</label>
                                    <div className="field-row">
                                        <input type="number" value={settings.payloadSize} onChange={e => setSettings({ ...settings, payloadSize: parseInt(e.target.value) || 0 })} />
                                        <span className="unit">バイト</span>
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label>タイムアウト:</label>
                                    <div className="field-row">
                                        <input type="number" value={settings.timeout} onChange={e => setSettings({ ...settings, timeout: parseInt(e.target.value) || 0 })} />
                                        <span className="unit">ミリ秒</span>
                                    </div>
                                </div>
                                <div className="field-group">
                                    <label>TTL:</label>
                                    <div className="field-row">
                                        <input type="number" value={settings.ttl} onChange={e => setSettings({ ...settings, ttl: parseInt(e.target.value) || 0 })} />
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
                )}

                {settingsTab === 'logs' && (
                    <div className="log-settings-container">
                        <div className="settings-section" style={{ maxWidth: 'none', background: 'transparent', border: 'none', padding: 0 }}>
                            <div style={{ border: 'none', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
                                <label className="checkbox-label" style={{ fontWeight: 'bold' }}>
                                    <input type="checkbox" checked={settings.logs.autoSave} onChange={e => setSettings({ ...settings, logs: { ...settings.logs, autoSave: e.target.checked } })} />
                                    Ping のログを自動保存する
                                </label>
                                <div className="ng-field-row" style={{ marginTop: '12px', opacity: settings.logs.autoSave ? 1 : 0.5 }}>
                                    <label style={{ minWidth: '60px' }}>保存先:</label>
                                    <div className="path-input-group">
                                        <input type="text" value={settings.logs.savePath} onChange={e => setSettings({ ...settings, logs: { ...settings.logs, savePath: e.target.value } })} disabled={!settings.logs.autoSave} />
                                        <button className="btn-small" onClick={selectDir} disabled={!settings.logs.autoSave}>...</button>
                                    </div>
                                </div>
                            </div>

                            <div className="ng-section-group" style={{ opacity: settings.logs.autoSave ? 1 : 0.5 }}>
                                <span style={{ fontSize: '13px', marginBottom: '8px', display: 'block' }}>ログファイル名</span>
                                <div className="radio-group" style={{ border: 'none', background: 'transparent', padding: 0 }}>
                                    <div className="ng-input-row" style={{ gap: '16px' }}>
                                        <label className="checkbox-label">
                                            <input type="radio" checked={settings.logs.fileNameSetting === 'fixed'} onChange={() => setSettings({ ...settings, logs: { ...settings.logs, fileNameSetting: 'fixed' } })} disabled={!settings.logs.autoSave} />
                                            固定ファイル名
                                        </label>
                                        <input type="text" value={settings.logs.fixedName} onChange={e => setSettings({ ...settings, logs: { ...settings.logs, fixedName: e.target.value } })} disabled={!settings.logs.autoSave || settings.logs.fileNameSetting !== 'fixed'} style={{ flex: 1 }} />
                                    </div>

                                    <div style={{ marginTop: '12px' }}>
                                        <label className="checkbox-label">
                                            <input type="radio" checked={settings.logs.fileNameSetting === 'dated'} onChange={() => setSettings({ ...settings, logs: { ...settings.logs, fileNameSetting: 'dated' } })} disabled={!settings.logs.autoSave} />
                                            年月日を付ける 例: ExPing130502.LOG
                                        </label>
                                        <div className="ng-nested-row" style={{ marginLeft: '24px', marginTop: '8px', gap: '20px' }}>
                                            <div className="ng-field-row">
                                                <label style={{ minWidth: 'auto' }}>接頭語:</label>
                                                <input type="text" value={settings.logs.prefix} onChange={e => setSettings({ ...settings, logs: { ...settings.logs, prefix: e.target.value } })} disabled={!settings.logs.autoSave || settings.logs.fileNameSetting !== 'dated'} style={{ width: '100px' }} />
                                            </div>
                                            <div className="ng-field-row">
                                                <label style={{ minWidth: 'auto' }}>拡張子:</label>
                                                <input type="text" value={settings.logs.extension} onChange={e => setSettings({ ...settings, logs: { ...settings.logs, extension: e.target.value } })} disabled={!settings.logs.autoSave || settings.logs.fileNameSetting !== 'dated'} style={{ width: '80px' }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {settingsTab === 'ng' && (
                    <div className="ng-settings-container">
                        <div className="settings-checkbox-grid">
                            <label className="checkbox-label">
                                <input type="checkbox" checked={settings.ng.changeTrayIcon} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, changeTrayIcon: e.target.checked } })} />
                                トレイアイコンを変化させる
                            </label>
                            <label className="checkbox-label">
                                <input type="checkbox" checked={settings.ng.showPopup} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, showPopup: e.target.checked } })} />
                                ポップアップメッセージを表示
                            </label>

                            <div className="ng-input-row">
                                <label className="checkbox-label">
                                    <input type="checkbox" checked={settings.ng.playSound} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, playSound: e.target.checked } })} />
                                    音を鳴らす
                                </label>
                                <div className="path-input-group" style={{ opacity: settings.ng.playSound ? 1 : 0.5 }}>
                                    <input type="text" value={settings.ng.soundFile} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, soundFile: e.target.value } })} disabled={!settings.ng.playSound} />
                                    <button className="btn-small" onClick={() => selectFile('sound')} disabled={!settings.ng.playSound}>...</button>
                                    <button className="btn-small" disabled={!settings.ng.playSound} onClick={() => playSound(settings.ng.soundFile)}>♪</button>
                                </div>
                            </div>

                            <div className="ng-section-group">
                                <label className="checkbox-label" style={{ marginBottom: '8px' }}>
                                    <input type="checkbox" checked={settings.ng.launchProgram} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, launchProgram: e.target.checked } })} />
                                    外部プログラムを起動
                                </label>
                                <div className="ng-nested-fields" style={{ opacity: settings.ng.launchProgram ? 1 : 0.5 }}>
                                    <div className="ng-field-row">
                                        <label>プログラム:</label>
                                        <div className="path-input-group">
                                            <input type="text" value={settings.ng.programPath} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, programPath: e.target.value } })} disabled={!settings.ng.launchProgram} />
                                            <button className="btn-small" onClick={() => selectFile('program')} disabled={!settings.ng.launchProgram}>...</button>
                                        </div>
                                    </div>
                                    <div className="ng-field-row">
                                        <label>オプション:</label>
                                        <input type="text" value={settings.ng.programOptions} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, programOptions: e.target.value } })} disabled={!settings.ng.launchProgram} style={{ flex: 1 }} />
                                    </div>
                                    <div className="ng-field-row">
                                        <label>作業ディレクトリ:</label>
                                        <div className="path-input-group">
                                            <input type="text" value={settings.ng.programWorkingDir} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, programWorkingDir: e.target.value } })} disabled={!settings.ng.launchProgram} />
                                            <button className="btn-small" onClick={selectDir} disabled={!settings.ng.launchProgram}>...</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="ng-input-row" style={{ marginTop: '8px' }}>
                                <label className="checkbox-label">
                                    <input type="checkbox" checked={settings.ng.executeOnDelay} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, executeOnDelay: e.target.checked } })} />
                                    レスポンス遅延時にNG処理を実行する
                                </label>
                                <div className="delay-input-group" style={{ opacity: settings.ng.executeOnDelay ? 1 : 0.5 }}>
                                    <input type="number" value={settings.ng.delayMs} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, delayMs: parseInt(e.target.value) || 0 } })} disabled={!settings.ng.executeOnDelay} style={{ width: '60px' }} />
                                    <span>ms以上</span>
                                </div>
                            </div>

                            <label className="checkbox-label">
                                <input type="checkbox" checked={settings.ng.onceOnly} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, onceOnly: e.target.checked } })} />
                                一度通知したアドレスは2回目以降通知しない
                            </label>

                            <label className="checkbox-label" style={{ opacity: 0.5 }}>
                                <input type="checkbox" checked={settings.ng.notIfPreviousNg} disabled onChange={e => setSettings({ ...settings, ng: { ...settings.ng, notIfPreviousNg: e.target.checked } })} />
                                前回もNGだった場合は通知しない
                            </label>

                            <div className="ng-section-group">
                                <label className="checkbox-label">
                                    <input type="checkbox" checked={settings.ng.notUntilCountReached} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, notUntilCountReached: e.target.checked } })} />
                                    NGが指定回数に達するまで、通知しない
                                </label>
                                <div className="ng-nested-row" style={{ opacity: settings.ng.notUntilCountReached ? 1 : 0.5, marginLeft: '24px', marginTop: '4px' }}>
                                    <span>回数:</span>
                                    <input type="number" value={settings.ng.countToNotify} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, countToNotify: parseInt(e.target.value) || 0 } })} disabled={!settings.ng.notUntilCountReached} style={{ width: '50px', margin: '0 8px' }} />
                                    <label className="checkbox-label">
                                        <input type="checkbox" checked={settings.ng.countConsecutiveOnly} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, countConsecutiveOnly: e.target.checked } })} disabled={!settings.ng.notUntilCountReached} />
                                        連続したNGのみカウントする
                                    </label>
                                </div>
                            </div>

                            <label className="checkbox-label">
                                <input type="checkbox" checked={settings.ng.notifyOnIntervalOnly} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, notifyOnIntervalOnly: e.target.checked } })} />
                                「通知しない」設定は定期実行ごとに有効
                            </label>
                        </div>
                    </div>
                )}

                {['ok'].includes(settingsTab) && (
                    <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>
                        この設定項目は準備中です
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsModal;
