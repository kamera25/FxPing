import React from 'react';
import { Settings } from '../../types';
import styles from '../SettingsModal.module.css';

interface LogSettingsProps {
    settings: Settings;
    setSettings: (settings: Settings) => void;
    selectDir: (target: 'ng' | 'logs') => Promise<void>;
}

const LogSettings: React.FC<LogSettingsProps> = ({ settings, setSettings, selectDir }) => {
    const getYYMMDD = (date: Date) => {
        const y = String(date.getFullYear()).slice(-2);
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}${m}${d}`;
    };

    const getActualFileName = () => {
        if (settings.logs.fileNameSetting === 'fixed') {
            return settings.logs.fixedName || '(未設定)';
        } else {
            const dateStr = getYYMMDD(new Date());
            const ext = settings.logs.extension.startsWith('.') ? settings.logs.extension.slice(1) : settings.logs.extension;
            return `${settings.logs.prefix}${dateStr}.${ext || 'LOG'}`;
        }
    };

    return (
        <div className={styles.contentBody} style={{ padding: 0 }}>
            <div className={styles.settingsSection}>
                <label className={styles.checkboxLabel} style={{ fontWeight: 'bold' }}>
                    <input type="checkbox" checked={settings.logs.autoSave} onChange={e => setSettings({ ...settings, logs: { ...settings.logs, autoSave: e.target.checked } })} />
                    Ping のログを自動保存する
                </label>
                <div className={styles.fieldRow} style={{ marginTop: '12px', opacity: settings.logs.autoSave ? 1 : 0.5 }}>
                    <label style={{ minWidth: '60px', fontSize: '12px' }}>保存先:</label>
                    <div className={styles.pathInputGroup}>
                        <input type="text" value={settings.logs.savePath} onChange={e => setSettings({ ...settings, logs: { ...settings.logs, savePath: e.target.value } })} disabled={!settings.logs.autoSave} style={{ flex: 1 }} />
                        <button className={styles.btnSmall} onClick={() => selectDir('logs')} disabled={!settings.logs.autoSave}>...</button>
                    </div>
                </div>

                <div className={styles.nestedFields} style={{ opacity: settings.logs.autoSave ? 1 : 0.5, marginTop: '16px' }}>
                    <span style={{ fontSize: '13px', marginBottom: '8px', display: 'block' }}>ログファイル名</span>
                    <div className={styles.radioGroup} style={{ flexDirection: 'column', gap: '8px' }}>
                        <div className={styles.fieldRow}>
                            <label className={styles.checkboxLabel}>
                                <input type="radio" checked={settings.logs.fileNameSetting === 'fixed'} onChange={() => setSettings({ ...settings, logs: { ...settings.logs, fileNameSetting: 'fixed' } })} disabled={!settings.logs.autoSave} />
                                固定ファイル名
                            </label>
                            <input type="text" value={settings.logs.fixedName} onChange={e => setSettings({ ...settings, logs: { ...settings.logs, fixedName: e.target.value } })} disabled={!settings.logs.autoSave || settings.logs.fileNameSetting !== 'fixed'} style={{ flex: 1 }} />
                        </div>

                        <div style={{ marginTop: '8px' }}>
                            <label className={styles.checkboxLabel}>
                                <input type="radio" checked={settings.logs.fileNameSetting === 'dated'} onChange={() => setSettings({ ...settings, logs: { ...settings.logs, fileNameSetting: 'dated' } })} disabled={!settings.logs.autoSave} />
                                年月日を付ける
                            </label>
                            <div className={styles.nestedFields} style={{ gap: '8px' }}>
                                <div className={styles.fieldRow}>
                                    <label style={{ minWidth: 'auto', fontSize: '12px' }}>接頭語:</label>
                                    <input type="text" value={settings.logs.prefix} onChange={e => setSettings({ ...settings, logs: { ...settings.logs, prefix: e.target.value } })} disabled={!settings.logs.autoSave || settings.logs.fileNameSetting !== 'dated'} style={{ width: '100px' }} />
                                </div>
                                <div className={styles.fieldRow}>
                                    <label style={{ minWidth: 'auto', fontSize: '12px' }}>拡張子:</label>
                                    <input type="text" value={settings.logs.extension} onChange={e => setSettings({ ...settings, logs: { ...settings.logs, extension: e.target.value } })} disabled={!settings.logs.autoSave || settings.logs.fileNameSetting !== 'dated'} style={{ width: '80px' }} />
                                </div>

                            </div>
                        </div>

                        <div style={{ marginTop: '16px', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', borderLeft: '4px solid var(--primary)', opacity: settings.logs.autoSave ? 1 : 0.5 }}>
                            <span style={{ fontSize: '12px', color: 'var(--primary)', display: 'block', marginBottom: '4px' }}>実際のファイル名 (プレビュー):</span>
                            <code style={{ fontSize: '14px', fontWeight: 'bold' }}>{getActualFileName()}</code>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogSettings;
