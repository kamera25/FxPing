import React from 'react';
import { Settings } from '../../types';

interface LogSettingsProps {
    settings: Settings;
    setSettings: (settings: Settings) => void;
    selectDir: () => Promise<void>;
}

const LogSettings: React.FC<LogSettingsProps> = ({ settings, setSettings, selectDir }) => {
    return (
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
    );
};

export default LogSettings;
