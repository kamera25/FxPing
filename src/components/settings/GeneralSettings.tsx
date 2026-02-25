import React from 'react';
import { Settings } from '../../types';

interface GeneralSettingsProps {
    settings: Settings;
    setSettings: (settings: Settings) => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings, setSettings }) => {
    return (
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
    );
};

export default GeneralSettings;
