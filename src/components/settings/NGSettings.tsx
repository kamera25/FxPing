import React from 'react';
import { Settings } from '../../types';
import styles from '../SettingsModal.module.css';

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
        <div className={styles.settingsGrid} style={{ gridTemplateColumns: '1fr' }}>
            <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={settings.ng.changeTrayIcon} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, changeTrayIcon: e.target.checked } })} />
                トレイアイコンを変化させる
            </label>
            <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={settings.ng.showPopup} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, showPopup: e.target.checked } })} />
                ポップアップメッセージを表示
            </label>

            <div className={styles.fieldRow}>
                <label className={styles.checkboxLabel}>
                    <input type="checkbox" checked={settings.ng.playSound} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, playSound: e.target.checked } })} />
                    音を鳴らす
                </label>
                <div className={styles.pathInputGroup} style={{ opacity: settings.ng.playSound ? 1 : 0.5 }}>
                    <input type="text" value={settings.ng.soundFile} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, soundFile: e.target.value } })} disabled={!settings.ng.playSound} />
                    <button className={styles.btnSmall} onClick={() => selectFile('sound')} disabled={!settings.ng.playSound}>選択</button>
                    <button className={styles.btnSmall} disabled={!settings.ng.playSound} onClick={() => playSound(settings.ng.soundFile)}>テスト</button>
                </div>
            </div>

            <div className={styles.settingsSection}>
                <label className={styles.checkboxLabel}>
                    <input type="checkbox" checked={settings.ng.launchProgram} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, launchProgram: e.target.checked } })} />
                    外部プログラムを起動
                </label>
                <div className={styles.nestedFields} style={{ opacity: settings.ng.launchProgram ? 1 : 0.5 }}>
                    <div className={styles.fieldRow}>
                        <label style={{ width: '100px', fontSize: '12px' }}>プログラム:</label>
                        <div className={styles.pathInputGroup}>
                            <input type="text" value={settings.ng.programPath} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, programPath: e.target.value } })} disabled={!settings.ng.launchProgram} />
                            <button className={styles.btnSmall} onClick={() => selectFile('program')} disabled={!settings.ng.launchProgram}>選択</button>
                        </div>
                    </div>
                    <div className={styles.fieldRow}>
                        <label style={{ width: '100px', fontSize: '12px' }}>オプション:</label>
                        <input type="text" value={settings.ng.programOptions} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, programOptions: e.target.value } })} disabled={!settings.ng.launchProgram} style={{ flex: 1 }} />
                    </div>
                    <div className={styles.fieldRow}>
                        <label style={{ width: '100px', fontSize: '12px' }}>作業フォルダ:</label>
                        <div className={styles.pathInputGroup}>
                            <input type="text" value={settings.ng.programWorkingDir} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, programWorkingDir: e.target.value } })} disabled={!settings.ng.launchProgram} />
                            <button className={styles.btnSmall} onClick={() => selectDir('ng')} disabled={!settings.ng.launchProgram}>選択</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.fieldRow}>
                <label className={styles.checkboxLabel}>
                    <input type="checkbox" checked={settings.ng.executeOnDelay} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, executeOnDelay: e.target.checked } })} />
                    レスポンス遅延時にNG処理を実行
                </label>
                <div className={styles.fieldRow} style={{ opacity: settings.ng.executeOnDelay ? 1 : 0.5 }}>
                    <input type="number" value={settings.ng.delayMs} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, delayMs: parseInt(e.target.value) || 0 } })} disabled={!settings.ng.executeOnDelay} className={styles.inputSmall} />
                    <span className={styles.unit}>ms以上</span>
                </div>
            </div>

            <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={settings.ng.onceOnly} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, onceOnly: e.target.checked } })} />
                一度通知したアドレスは2回目以降通知しない
            </label>

            <label className={styles.checkboxLabel} style={{ opacity: 0.5 }}>
                <input type="checkbox" checked={settings.ng.notIfPreviousNg} disabled onChange={e => setSettings({ ...settings, ng: { ...settings.ng, notIfPreviousNg: e.target.checked } })} />
                前回もNGだった場合は通知しない
            </label>

            <div className={styles.settingsSection}>
                <label className={styles.checkboxLabel}>
                    <input type="checkbox" checked={settings.ng.notUntilCountReached} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, notUntilCountReached: e.target.checked } })} />
                    NGが特定回数に達するまで通知しない
                </label>
                <div className={styles.nestedFields} style={{ opacity: settings.ng.notUntilCountReached ? 1 : 0.5 }}>
                    <div className={styles.fieldRow}>
                        <span style={{ fontSize: '12px' }}>回数:</span>
                        <input type="number" value={settings.ng.countToNotify} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, countToNotify: parseInt(e.target.value) || 0 } })} disabled={!settings.ng.notUntilCountReached} className={styles.inputSmall} />
                        <label className={styles.checkboxLabel}>
                            <input type="checkbox" checked={settings.ng.countConsecutiveOnly} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, countConsecutiveOnly: e.target.checked } })} disabled={!settings.ng.notUntilCountReached} />
                            連続したNGのみカウント
                        </label>
                    </div>
                </div>
            </div>

            <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={settings.ng.notifyOnIntervalOnly} onChange={e => setSettings({ ...settings, ng: { ...settings.ng, notifyOnIntervalOnly: e.target.checked } })} />
                「通知しない」設定は定期実行ごとに有効
            </label>
        </div>
    );
};

export default NGSettings;
