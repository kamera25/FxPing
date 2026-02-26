import React, { useState } from 'react';
import { Settings } from '../types';
import GeneralSettings from './settings/GeneralSettings';
import PingSettings from './settings/PingSettings';
import LogSettings from './settings/LogSettings';
import NGSettings from './settings/NGSettings';
import OKSettings from './settings/OKSettings';

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
    const [settingsTab, setSettingsTab] = useState("ping");

    const renderTabContent = () => {
        switch (settingsTab) {
            case 'general':
                return <GeneralSettings settings={settings} setSettings={setSettings} />;
            case 'ping':
                return <PingSettings settings={settings} setSettings={setSettings} />;
            case 'logs':
                return <LogSettings settings={settings} setSettings={setSettings} selectDir={selectDir} />;
            case 'ng':
                return (
                    <NGSettings
                        settings={settings}
                        setSettings={setSettings}
                        selectFile={selectFile}
                        selectDir={selectDir}
                        playSound={playSound}
                    />
                );
            case 'ok':
                return <OKSettings />;
            default:
                return null;
        }
    };

    return (
        <div className="settings-container" style={{ padding: 0 }}>
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)' }}>
                <h2 style={{ fontSize: '16px', color: 'var(--primary)', margin: 0 }}>設定</h2>
                <button className="btn-small" onClick={() => setShowSettings(false)}>閉じる</button>
            </div>

            <div className="settings-header-tabs">
                <div className={`settings-tab ${settingsTab === 'ping' ? 'active' : ''}`} onClick={() => setSettingsTab('ping')}>Ping実行設定</div>
                <div className={`settings-tab ${settingsTab === 'general' ? 'active' : ''}`} onClick={() => setSettingsTab('general')}>基本設定</div>
                <div className={`settings-tab ${settingsTab === 'logs' ? 'active' : ''}`} onClick={() => setSettingsTab('logs')}>ログ保存</div>
                <div className={`settings-tab ${settingsTab === 'ng' ? 'active' : ''}`} onClick={() => setSettingsTab('ng')}>NG時処理</div>
                <div className={`settings-tab ${settingsTab === 'ok' ? 'active' : ''}`} onClick={() => setSettingsTab('ok')}>OK時処理</div>
            </div>

            <div className="settings-content-body">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default SettingsModal;
