import { describe, it, expect, beforeEach } from 'vitest';
import { useTargetStore } from './targetStore';

describe('targetStore', () => {
    beforeEach(() => {
        // Reset the store before each test
        const store = useTargetStore.getState();
        store.setTargets([
            { host: "127.0.0.1", remarks: "ローカルホスト", isEnabled: true },
            { host: "8.8.8.8", remarks: "Google DNS(v4)", isEnabled: true },
            { host: "2001:4860:4860::8888", remarks: "Google DNS(v6)", isEnabled: true }
        ]);
        store.setNewTarget('');
        store.setNewRemarks('');
        store.setIsInputError(false);
        store.setExPingText('');
        store.setShowExPingInput(false);
    });

    it('toggleTargetEnabled should toggle individual target', () => {
        const store = useTargetStore.getState();
        store.toggleTargetEnabled("8.8.8.8");

        const state = useTargetStore.getState();
        const t1 = state.targets.find(t => t.host === "127.0.0.1");
        const t2 = state.targets.find(t => t.host === "8.8.8.8");

        expect(t1?.isEnabled).toBe(true);
        expect(t2?.isEnabled).toBe(false);

        store.toggleTargetEnabled("8.8.8.8");
        expect(useTargetStore.getState().targets.find(t => t.host === "8.8.8.8")?.isEnabled).toBe(true);
    });

    it('setAllTargetsEnabled should toggle all targets', () => {
        const store = useTargetStore.getState();
        store.setAllTargetsEnabled(false);

        expect(useTargetStore.getState().targets.every(t => t.isEnabled === false)).toBe(true);

        store.setAllTargetsEnabled(true);
        expect(useTargetStore.getState().targets.every(t => t.isEnabled === true)).toBe(true);
    });

    it('invertTargetsEnabled should invert all targets', () => {
        const store = useTargetStore.getState();
        store.toggleTargetEnabled("8.8.8.8"); // Set one to false

        store.invertTargetsEnabled();

        const state = useTargetStore.getState();
        expect(state.targets.find(t => t.host === "127.0.0.1")?.isEnabled).toBe(false);
        expect(state.targets.find(t => t.host === "8.8.8.8")?.isEnabled).toBe(true);
        expect(state.targets.find(t => t.host === "2001:4860:4860::8888")?.isEnabled).toBe(false);
    });

    it('setTargetsEnabledByStats should filter ok1', () => {
        const store = useTargetStore.getState();
        const stats = {
            "127.0.0.1": { target: "127.0.0.1", executedCount: 1, failedCount: 0, minTime: 1, maxTime: 1, avgTime: 1, totalTime: 1, successCount: 1, isLastFailed: false },
            "8.8.8.8": { target: "8.8.8.8", executedCount: 1, failedCount: 1, minTime: null, maxTime: null, avgTime: null, totalTime: 0, successCount: 0, isLastFailed: true }
        };
        store.setTargetsEnabledByStats(stats, 'ok1');

        const state = useTargetStore.getState();
        expect(state.targets.find(t => t.host === "127.0.0.1")?.isEnabled).toBe(true);
        expect(state.targets.find(t => t.host === "8.8.8.8")?.isEnabled).toBe(false);
        expect(state.targets.find(t => t.host === "2001:4860:4860::8888")?.isEnabled).toBe(false); // No stats
    });

    it('setTargetsEnabledByStats should filter ng1', () => {
        const store = useTargetStore.getState();
        const stats = {
            "127.0.0.1": { target: "127.0.0.1", executedCount: 1, failedCount: 0, minTime: 1, maxTime: 1, avgTime: 1, totalTime: 1, successCount: 1, isLastFailed: false },
            "8.8.8.8": { target: "8.8.8.8", executedCount: 1, failedCount: 1, minTime: null, maxTime: null, avgTime: null, totalTime: 0, successCount: 0, isLastFailed: true }
        };
        store.setTargetsEnabledByStats(stats, 'ng1');

        const state = useTargetStore.getState();
        expect(state.targets.find(t => t.host === "127.0.0.1")?.isEnabled).toBe(false);
        expect(state.targets.find(t => t.host === "8.8.8.8")?.isEnabled).toBe(true);
    });

    it('setTargetsEnabledByStats should filter allNg', () => {
        const store = useTargetStore.getState();
        const stats = {
            "127.0.0.1": { target: "127.0.0.1", executedCount: 2, failedCount: 1, minTime: 1, maxTime: 1, avgTime: 1, totalTime: 1, successCount: 1, isLastFailed: false },
            "8.8.8.8": { target: "8.8.8.8", executedCount: 2, failedCount: 2, minTime: null, maxTime: null, avgTime: null, totalTime: 0, successCount: 0, isLastFailed: true }
        };
        store.setTargetsEnabledByStats(stats, 'allNg');

        const state = useTargetStore.getState();
        expect(state.targets.find(t => t.host === "127.0.0.1")?.isEnabled).toBe(false); // partially OK
        expect(state.targets.find(t => t.host === "8.8.8.8")?.isEnabled).toBe(true); // all NG
    });

    it('setTargetsEnabledByStats should filter allOk', () => {
        const store = useTargetStore.getState();
        const stats = {
            "127.0.0.1": { target: "127.0.0.1", executedCount: 3, failedCount: 0, minTime: 1, maxTime: 1, avgTime: 1, totalTime: 1, successCount: 3, isLastFailed: false },
            "8.8.8.8": { target: "8.8.8.8", executedCount: 2, failedCount: 1, minTime: null, maxTime: null, avgTime: null, totalTime: 0, successCount: 1, isLastFailed: true }
        };
        store.setTargetsEnabledByStats(stats, 'allOk');

        const state = useTargetStore.getState();
        expect(state.targets.find(t => t.host === "127.0.0.1")?.isEnabled).toBe(true); // all OK
        expect(state.targets.find(t => t.host === "8.8.8.8")?.isEnabled).toBe(false); // partially NG
    });
});
