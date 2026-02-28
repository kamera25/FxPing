import React, { useState } from 'react';
import { Settings } from '../types';
import GeneralSettings from './settings/GeneralSettings';
import PingSettings from './settings/PingSettings';
import LogSettings from './settings/LogSettings';
import NGSettings from './settings/NGSettings';
import OKSettings from './settings/OKSettings';
import styles from './SettingsModal.module.css';

interface SettingsModalProps {
    settings: Settings;
    setSettings: (settings: Settings) => void;
    setShowSettings: (show: boolean) => void;
    selectFile: (section: 'ng' | 'ok', type: 'sound' | 'program') => Promise<void>;
    selectDir: (target: 'ng' | 'ok' | 'logs') => Promise<void>;
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
                return <LogSettings settings={settings} setSettings={setSettings} selectDir={() => selectDir('logs')} />;
            case 'ng':
                return (
                    <NGSettings
                        settings={settings}
                        setSettings={setSettings}
                        selectFile={(type) => selectFile('ng', type)}
                        selectDir={() => selectDir('ng')}
                        playSound={playSound}
                    />
                );
            case 'ok':
                return (
                    <OKSettings
                        settings={settings}
                        setSettings={setSettings}
                        selectFile={(type) => selectFile('ok', type)}
                        selectDir={() => selectDir('ok')}
                        playSound={playSound}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className={styles.settingsContainer}>
            <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>設定</h2>
                <button className={styles.btnSmall} onClick={() => setShowSettings(false)}>閉じる</button>
            </div>

            <div className={styles.headerTabs}>
                <div className={`${styles.tab} ${settingsTab === 'ping' ? styles.active : ''}`} onClick={() => setSettingsTab('ping')}>Ping実行設定</div>
                <div className={`${styles.tab} ${settingsTab === 'general' ? styles.active : ''}`} onClick={() => setSettingsTab('general')}>基本設定</div>
                <div className={`${styles.tab} ${settingsTab === 'logs' ? styles.active : ''}`} onClick={() => setSettingsTab('logs')}>ログ保存</div>
                <div className={`${styles.tab} ${settingsTab === 'ng' ? styles.active : ''}`} onClick={() => setSettingsTab('ng')}>NG時処理</div>
                <div className={`${styles.tab} ${settingsTab === 'ok' ? styles.active : ''}`} onClick={() => setSettingsTab('ok')}>OK時処理</div>
            </div>

            <div className={styles.contentBody}>
                {renderTabContent()}
            </div>
        </div>
    );
};

export default SettingsModal;
