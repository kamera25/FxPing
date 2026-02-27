import React from 'react';
import { Settings } from '../../types';
import styles from '../SettingsModal.module.css';

interface GeneralSettingsProps {
    settings: Settings;
    setSettings: (settings: Settings) => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings, setSettings }) => {
    return (
        <div className={styles.settingsGrid} style={{ gridTemplateColumns: '1fr' }}>
            <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={settings.hideOnMinimize} onChange={e => setSettings({ ...settings, hideOnMinimize: e.target.checked })} />
                最小化時、タスクバーに非表示
            </label>
            <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={settings.saveSettingsOnExit} onChange={e => setSettings({ ...settings, saveSettingsOnExit: e.target.checked })} />
                終了時に対象ファイルの環境を保存する
            </label>
            <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={settings.saveAsCsv} onChange={e => setSettings({ ...settings, saveAsCsv: e.target.checked })} />
                Ping 結果の保存はCSV形式
            </label>

            <div className={styles.settingsSection}>
                <label className={styles.checkboxLabel}>
                    <input type="checkbox" checked={settings.autoDeleteResults} onChange={e => setSettings({ ...settings, autoDeleteResults: e.target.checked })} />
                    Ping 結果の自動削除
                </label>
                <div className={styles.nestedFields} style={{ opacity: settings.autoDeleteResults ? 1 : 0.5 }}>
                    <div className={styles.fieldRow}>
                        <input
                            type="number"
                            value={settings.maxResults}
                            disabled={!settings.autoDeleteResults}
                            onChange={e => setSettings({ ...settings, maxResults: parseInt(e.target.value) || 0 })}
                            className={styles.inputSmall}
                        />
                        <span className={styles.unit}>件を超えた場合、古い結果から削除する</span>
                    </div>
                </div>
            </div>

            <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={settings.flashTrayIcon} onChange={e => setSettings({ ...settings, flashTrayIcon: e.target.checked })} />
                Ping 実行中にトレイアイコンを点滅させる
            </label>
            <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={settings.prohibitFragmentation} onChange={e => setSettings({ ...settings, prohibitFragmentation: e.target.checked })} />
                パケットのフラグメントを禁止する
            </label>
        </div>
    );
};

export default GeneralSettings;
