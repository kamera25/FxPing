import React from 'react';
import { Settings } from '../../types';

interface NGSettingsProps {
    settings: Settings;
    setSettings: (settings: Settings) => void;
    selectFile: (type: 'sound' | 'program') => Promise<void>;
    selectDir: (target: 'ng' | 'logs') => Promise<void>;
    playSound: (filePath: string) => Promise<void>;
}

const NGSettings: React.FC<NGSettingsProps> = ({
    settings,
    setSettings,
    selectFile,
    selectDir,
    playSound
}) => {
    return (
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
                                <button className="btn-small" onClick={() => selectDir('ng')} disabled={!settings.ng.launchProgram}>...</button>
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
    );
};

export default NGSettings;
