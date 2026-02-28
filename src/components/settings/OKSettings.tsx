import React from 'react';
import { Settings } from '../../types';
import styles from '../SettingsModal.module.css';

interface OKSettingsProps {
    settings: Settings;
    setSettings: (settings: Settings) => void;
    selectFile: (type: 'sound' | 'program') => Promise<void>;
    selectDir: (target: 'ok') => Promise<void>;
    playSound: (filePath: string) => Promise<void>;
}

const OKSettings: React.FC<OKSettingsProps> = ({
    settings,
    setSettings,
    selectFile,
    selectDir,
    playSound
}) => {
    return (
        <div className={styles.settingsGrid} style={{ gridTemplateColumns: '1fr' }}>
            <div className={styles.fieldRow}>
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={settings.ok.playSound}
                        onChange={e => setSettings({ ...settings, ok: { ...settings.ok, playSound: e.target.checked } })}
                    />
                    音を鳴らす
                </label>
                <div className={styles.pathInputGroup} style={{ opacity: settings.ok.playSound ? 1 : 0.5 }}>
                    <input
                        type="text"
                        value={settings.ok.soundFile}
                        onChange={e => setSettings({ ...settings, ok: { ...settings.ok, soundFile: e.target.value } })}
                        disabled={!settings.ok.playSound}
                    />
                    <button className={styles.btnSmall} onClick={() => selectFile('sound')} disabled={!settings.ok.playSound}>...</button>
                    <button className={styles.btnSmall} disabled={!settings.ok.playSound} onClick={() => playSound(settings.ok.soundFile)}>♪</button>
                </div>
            </div>

            <label className={styles.checkboxLabel}>
                <input
                    type="checkbox"
                    checked={settings.ok.showPopup}
                    onChange={e => setSettings({ ...settings, ok: { ...settings.ok, showPopup: e.target.checked } })}
                />
                ポップアップメッセージを表示
            </label>

            <div className={styles.settingsSection}>
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={settings.ok.launchProgram}
                        onChange={e => setSettings({ ...settings, ok: { ...settings.ok, launchProgram: e.target.checked } })}
                    />
                    外部プログラムを起動
                </label>
                <div className={styles.nestedFields} style={{ opacity: settings.ok.launchProgram ? 1 : 0.5 }}>
                    <div className={styles.fieldRow}>
                        <label style={{ width: '100px', fontSize: '12px', color: '#666' }}>プログラム:</label>
                        <div className={styles.pathInputGroup}>
                            <input
                                type="text"
                                value={settings.ok.programPath}
                                onChange={e => setSettings({ ...settings, ok: { ...settings.ok, programPath: e.target.value } })}
                                disabled={!settings.ok.launchProgram}
                            />
                            <button className={styles.btnSmall} onClick={() => selectFile('program')} disabled={!settings.ok.launchProgram}>...</button>
                        </div>
                    </div>
                    <div className={styles.fieldRow}>
                        <label style={{ width: '100px', fontSize: '12px', color: '#666' }}>オプション:</label>
                        <input
                            type="text"
                            value={settings.ok.programOptions}
                            onChange={e => setSettings({ ...settings, ok: { ...settings.ok, programOptions: e.target.value } })}
                            disabled={!settings.ok.launchProgram}
                            style={{ flex: 1 }}
                        />
                    </div>
                    <div className={styles.fieldRow}>
                        <label style={{ width: '100px', fontSize: '12px', color: '#666' }}>作業ディレクトリ:</label>
                        <div className={styles.pathInputGroup}>
                            <input
                                type="text"
                                value={settings.ok.programWorkingDir}
                                onChange={e => setSettings({ ...settings, ok: { ...settings.ok, programWorkingDir: e.target.value } })}
                                disabled={!settings.ok.launchProgram}
                            />
                            <button className={styles.btnSmall} onClick={() => selectDir('ok')} disabled={!settings.ok.launchProgram}>...</button>
                        </div>
                    </div>
                </div>
            </div>

            <label className={styles.checkboxLabel}>
                <input
                    type="checkbox"
                    checked={settings.ok.notIfPreviousOk}
                    onChange={e => setSettings({ ...settings, ok: { ...settings.ok, notIfPreviousOk: e.target.checked } })}
                />
                前回もOKだった場合は通知しない
            </label>

            <label className={styles.checkboxLabel}>
                <input
                    type="checkbox"
                    checked={settings.ok.notifyOnIntervalOnly}
                    onChange={e => setSettings({ ...settings, ok: { ...settings.ok, notifyOnIntervalOnly: e.target.checked } })}
                />
                「通知しない」設定は定期実行ごとに有効
            </label>
        </div>
    );
};

export default OKSettings;

