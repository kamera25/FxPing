import React from 'react';
import styles from './TabBar.module.css';

interface TabBarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    setShowSettings: (show: boolean) => void;
    handleSave: () => void;
}

const TabBar: React.FC<TabBarProps> = ({ activeTab, setActiveTab, setShowSettings, handleSave }) => {
    return (
        <div className={styles.tabBar}>
            <div className={styles.tabs}>
                <div className={`${styles.tab} ${activeTab === 'targets' ? styles.active : ''}`} onClick={() => { setActiveTab('targets'); setShowSettings(false); }}>対象</div>
                <div className={`${styles.tab} ${activeTab === 'results' ? styles.active : ''}`} onClick={() => { setActiveTab('results'); setShowSettings(false); }}>Ping 結果</div>
                <div className={`${styles.tab} ${activeTab === 'stats' ? styles.active : ''}`} onClick={() => { setActiveTab('stats'); setShowSettings(false); }}>Ping 統計</div>
                <div className={`${styles.tab} ${activeTab === 'trace' ? styles.active : ''}`} onClick={() => { setActiveTab('trace'); setShowSettings(false); }}>TraceRoute</div>
            </div>
            <div className={styles.actions}>
                <button className={styles.saveButton} onClick={handleSave} title="保存">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M17,3H5C3.89,3,3,3.9,3,5v14c0,1.1,0.89,2,2,2h14c1.1,0,2-0.9,2-2V7L17,3z M12,19c-1.66,0-3-1.34-3-3s1.34-3,3-3s3,1.34,3,3 S13.66,19,12,19z M15,9H5V5h10V9z" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default TabBar;
