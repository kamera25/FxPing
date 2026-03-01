import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from './settingsStore';

describe('settingsStore', () => {
    beforeEach(() => {
        // Reset store to initial state if possible, 
        // but Zustand stores persist in tests unless manually reset.
        // For this test, we just ensure it behaves correctly.
    });

    it('should have initial settings', () => {
        const state = useSettingsStore.getState();
        expect(state.settings).toBeDefined();
        expect(state.showSettings).toBe(false);
    });

    it('should update settings', () => {
        const { setSettings } = useSettingsStore.getState();
        const newSettings = { ...useSettingsStore.getState().settings, interval: 999 };
        setSettings(newSettings);
        expect(useSettingsStore.getState().settings.interval).toBe(999);
    });

    it('should toggle showSettings', () => {
        const { setShowSettings } = useSettingsStore.getState();
        setShowSettings(true);
        expect(useSettingsStore.getState().showSettings).toBe(true);
        setShowSettings(false);
        expect(useSettingsStore.getState().showSettings).toBe(false);
    });
});
