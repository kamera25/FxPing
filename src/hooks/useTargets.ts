import { invoke } from "@tauri-apps/api/core";
import { useStore } from "../store/useStore";
import { Target } from "../types";
import { parseExPingText } from "../utils/logic";

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
            try {
                await invoke("validate_host", { host: item.host });
                newTargets.push(item);
            } catch (e) {
                invalidHosts.push(`${item.host} (${e})`);
            }
        }
        return { newTargets, invalidHosts };
    };

    const applyParsedTargets = (newTargets: Target[], invalidHosts: string[]) => {
        if (invalidHosts.length > 0) {
            alert(`The following targets were skipped due to validation errors:\n${invalidHosts.join('\n')}`);
        }

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
                const content = event.target?.result;
                if (typeof content === 'string') {
                    const { newTargets, invalidHosts } = await parseExPingContent(content);
                    applyParsedTargets(newTargets, invalidHosts);
                }
            };
            reader.readAsText(file);
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
                const content = event.target?.result;
                if (typeof content === 'string') {
                    setExPingText(content);
                }
            };
            reader.readAsText(file);
            return;
        }

        const text = e.dataTransfer.getData("text");
        if (text) {
            setExPingText(text);
        }
    };

    return {
        addTarget,
        removeTarget,
        handleExPingApply,
        handleTargetListDrop,
        handleDrop
    };
};
