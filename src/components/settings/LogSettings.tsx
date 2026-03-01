import { useSettingsStore } from '../../store/settingsStore';
// No Settings import needed
import styles from '../SettingsModal.module.css';

interface LogSettingsProps {
    selectDir: (target: 'ng' | 'logs') => Promise<void>;
}

const LogSettings: React.FC<LogSettingsProps> = ({ selectDir }) => {
    const { settings, setSettings } = useSettingsStore();
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
        <div className={styles.settingsSection}>
            <label className={styles.checkboxLabel} style={{ fontWeight: 'bold' }}>
                <input type="checkbox" checked={settings.logs.autoSave} onChange={e => setSettings({ ...settings, logs: { ...settings.logs, autoSave: e.target.checked } })} />
                Ping のログを自動保存する
            </label>
            <div className={styles.nestedFields} style={{ opacity: settings.logs.autoSave ? 1 : 0.5 }}>
                <div className={styles.fieldRow}>
                    <label style={{ minWidth: '60px', fontSize: '12px' }}>保存先:</label>
                    <div className={styles.pathInputGroup}>
                        <input type="text" value={settings.logs.savePath} onChange={e => setSettings({ ...settings, logs: { ...settings.logs, savePath: e.target.value } })} disabled={!settings.logs.autoSave} />
                        <button className={styles.btnSmall} onClick={() => selectDir('logs')} disabled={!settings.logs.autoSave}>選択</button>
                    </div>
                </div>

                <div style={{ marginTop: '12px' }}>
                    <span style={{ fontSize: '13px', marginBottom: '8px', display: 'block', color: 'rgba(255,255,255,0.7)' }}>ログファイル名</span>
                    <div className={styles.radioGroup} style={{ flexDirection: 'column', gap: '12px' }}>
                        <div className={styles.fieldRow}>
                            <label className={styles.checkboxLabel}>
                                <input type="radio" checked={settings.logs.fileNameSetting === 'fixed'} onChange={() => setSettings({ ...settings, logs: { ...settings.logs, fileNameSetting: 'fixed' } })} disabled={!settings.logs.autoSave} />
                                固定名:
                            </label>
                            <input type="text" value={settings.logs.fixedName} onChange={e => setSettings({ ...settings, logs: { ...settings.logs, fixedName: e.target.value } })} disabled={!settings.logs.autoSave || settings.logs.fileNameSetting !== 'fixed'} style={{ flex: 1 }} />
                        </div>

                        <div>
                            <label className={styles.checkboxLabel}>
                                <input type="radio" checked={settings.logs.fileNameSetting === 'dated'} onChange={() => setSettings({ ...settings, logs: { ...settings.logs, fileNameSetting: 'dated' } })} disabled={!settings.logs.autoSave} />
                                年月日を付与
                            </label>
                            <div className={styles.nestedFields} style={{ gap: '8px', marginTop: '8px' }}>
                                <div className={styles.fieldRow}>
                                    <label style={{ minWidth: 'auto', fontSize: '12px' }}>接頭語:</label>
                                    <input type="text" value={settings.logs.prefix} onChange={e => setSettings({ ...settings, logs: { ...settings.logs, prefix: e.target.value } })} disabled={!settings.logs.autoSave || settings.logs.fileNameSetting !== 'dated'} style={{ width: '100px' }} />
                                    <label style={{ minWidth: 'auto', fontSize: '12px', marginLeft: '12px' }}>拡張子:</label>
                                    <input type="text" value={settings.logs.extension} onChange={e => setSettings({ ...settings, logs: { ...settings.logs, extension: e.target.value } })} disabled={!settings.logs.autoSave || settings.logs.fileNameSetting !== 'dated'} style={{ width: '80px' }} />
                                </div>
                            </div>
                        </div>

                        <div style={{
                            marginTop: '16px',
                            padding: '12px',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            opacity: settings.logs.autoSave ? 1 : 0.5
                        }}>
                            <span style={{ fontSize: '11px', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>ファイル名プレビュー</span>
                            <code style={{ fontSize: '13px', fontWeight: '600', color: 'var(--on-background)' }}>{getActualFileName()}</code>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogSettings;
