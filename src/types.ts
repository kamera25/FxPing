export interface PingResult {
    target: string;
    ip: string;
    time_ms: number | null;
    status: string;
    timestamp: string;
    remarks: string;
}

export interface Target {
    host: string;
    remarks: string;
}

export interface TraceHop {
    target: string;
    ttl: number;
    ip: string | null;
    fqdn?: string | null;
    time_ms: number | null;
}

export interface TraceResult {
    target: string;
    ping_ok: boolean | null;
    hops: TraceHop[];
    timestamp: string;
}

export interface TargetStats {
    target: string;
    executedCount: number;
    failedCount: number;
    minTime: number | null;
    maxTime: number | null;
    avgTime: number | null;
    totalTime: number;
    successCount: number;
    isLastFailed: boolean;
}

export interface Settings {
    repeatCount: number;
    interval: number;
    payloadSize: number;
    timeout: number;
    ttl: number;
    repeatOrder: 'sequential' | 'robin';
    repeatMode: 'parallel' | 'sequential' | 'robin';
    periodicExecution: boolean;
    periodicInterval: number;
    hideOnMinimize: boolean;
    saveSettingsOnExit: boolean;
    saveAsCsv: boolean;
    autoDeleteResults: boolean;
    maxResults: number;
    flashTrayIcon: boolean;
    prohibitFragmentation: boolean;
    maxHops: number;
    resolveHostnames: boolean;
    ng: {
        changeTrayIcon: boolean;
        showPopup: boolean;
        playSound: boolean;
        soundFile: string;
        launchProgram: boolean;
        programPath: string;
        programOptions: string;
        programWorkingDir: string;
        executeOnDelay: boolean;
        delayMs: number;
        onceOnly: boolean;
        notIfPreviousNg: boolean;
        notUntilCountReached: boolean;
        countToNotify: number;
        countConsecutiveOnly: boolean;
        notifyOnIntervalOnly: boolean;
    };
    logs: {
        autoSave: boolean;
        savePath: string;
        fileNameSetting: 'fixed' | 'dated';
        fixedName: string;
        prefix: string;
        extension: string;
    };
}
