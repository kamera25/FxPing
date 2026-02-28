import { invoke } from "@tauri-apps/api/core";
import { useStore } from "../store/useStore";
import { Target } from "../types";
import { parseExPingText, isValidHost } from "../utils/logic";

export const useTargets = () => {
    const {
        targets, setTargets,
        newTarget, setNewTarget,
        newRemarks, setNewRemarks,
        setIsInputError,
        setExPingText,
        setShowExPingInput,
        exPingText
    } = useStore();

    const triggerShake = () => {
        setIsInputError(true);
        setTimeout(() => setIsInputError(false), 500);
    };

    const addTarget = async () => {
        if (!newTarget) {
            triggerShake();
            return;
        }

        if (!isValidHost(newTarget)) {
            triggerShake();
            return;
        }

        try {
            await invoke("validate_host", { host: newTarget });
            if (!targets.some(t => t.host === newTarget)) {
                setTargets([...targets, { host: newTarget, remarks: newRemarks }]);
                setNewTarget("");
                setNewRemarks("");
            }
        } catch (e) {
            triggerShake();
            console.error(`Invalid target: ${e}`);
        }
    };

    const removeTarget = (t: string) => {
        setTargets(targets.filter(item => item.host !== t));
    };

    const parseExPingContent = async (text: string) => {
        const items = parseExPingText(text);
        const newTargets: Target[] = [];
        const invalidHosts: string[] = [];

        for (const item of items) {
            if (isValidHost(item.host)) {
                newTargets.push(item);
            } else {
                invalidHosts.push(`${item.host} (Invalid format)`);
            }
        }
        return { newTargets, invalidHosts };
    };

    const applyParsedTargets = (newTargets: Target[], invalidHosts: string[]) => {

        if (newTargets.length > 0) {
            setTargets(newTargets);
            setShowExPingInput(false);
            setExPingText("");
        }
    };

    const handleExPingApply = async () => {
        const { newTargets, invalidHosts } = await parseExPingContent(exPingText);
        applyParsedTargets(newTargets, invalidHosts);
    };

    const handleTargetListDrop = (e: React.DragEvent) => {
        e.preventDefault();

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            const reader = new FileReader();
            reader.onload = async (event) => {
                const arrayBuffer = event.target?.result as ArrayBuffer;
                if (arrayBuffer) {
                    let content = '';
                    try {
                        const decoder = new TextDecoder('utf-8', { fatal: true });
                        content = decoder.decode(arrayBuffer);
                    } catch (err) {
                        const decoder = new TextDecoder('shift_jis');
                        content = decoder.decode(arrayBuffer);
                    }
                    const { newTargets, invalidHosts } = await parseExPingContent(content);
                    applyParsedTargets(newTargets, invalidHosts);
                }
            };
            reader.readAsArrayBuffer(file);
            return;
        }

        const text = e.dataTransfer.getData("text");
        if (text) {
            parseExPingContent(text).then(({ newTargets, invalidHosts }) => {
                applyParsedTargets(newTargets, invalidHosts);
            });
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                const arrayBuffer = event.target?.result as ArrayBuffer;
                if (arrayBuffer) {
                    let content = '';
                    try {
                        const decoder = new TextDecoder('utf-8', { fatal: true });
                        content = decoder.decode(arrayBuffer);
                    } catch (err) {
                        const decoder = new TextDecoder('shift_jis');
                        content = decoder.decode(arrayBuffer);
                    }
                    setExPingText(content);
                }
            };
            reader.readAsArrayBuffer(file);
            return;
        }

        const text = e.dataTransfer.getData("text");
        if (text) {
            setExPingText(text);
        }
    };

    const loadDefTargets = async () => {
        try {
            const content = await invoke<string | null>("load_def_targets");
            if (content) {
                const { newTargets, invalidHosts } = await parseExPingContent(content);
                if (newTargets.length > 0) {
                    setTargets(newTargets);
                }
                if (invalidHosts.length > 0) {
                    console.warn("Some targets in ExPing.def were invalid:", invalidHosts);
                }
            }
        } catch (e) {
            console.error("Failed to load ExPing.def:", e);
        }
    };

    return {
        addTarget,
        removeTarget,
        handleExPingApply,
        handleTargetListDrop,
        handleDrop,
        loadDefTargets
    };
};
