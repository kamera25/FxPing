import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import "./App.css";

// Types
import { PingResult, Target, TraceResult, TargetStats, Settings } from "./types";

// Components
import Header from "./components/Header";
import TabBar from "./components/TabBar";
import StatsBar from "./components/StatsBar";
import SettingsModal from "./components/SettingsModal";
import AlertOverlay from "./components/AlertOverlay";

// Tabs
import TargetsTab from "./components/Tabs/TargetsTab";
import ResultsTab from "./components/Tabs/ResultsTab";
import StatsTab from "./components/Tabs/StatsTab";
import TraceRouteTab from "./components/Tabs/TraceRouteTab";

function App() {
  const [activeTab, setActiveTab] = useState("results");
  const [targets, setTargets] = useState<Target[]>([
    { host: "127.0.0.1", remarks: "ローカルホスト" },
    { host: "8.8.8.8", remarks: "Google DNS" }
  ]);
  const [newTarget, setNewTarget] = useState("");
  const [newRemarks, setNewRemarks] = useState("");
  const [results, setResults] = useState<PingResult[]>([]);
  const [targetStats, setTargetStats] = useState<Record<string, TargetStats>>({});
  const [traceResults, setTraceResults] = useState<TraceResult[]>([]);
  const [isPinging, setIsPinging] = useState(false);
  const [_targetNgStats, setTargetNgStats] = useState<Record<string, { consecutiveCount: number, alerted: boolean }>>({});
  const [activeAlert, setActiveAlert] = useState<{ target: string, timestamp: string, reason: string } | null>(null);
  const [isTracing, setIsTracing] = useState(false);
  const [traceProtocol, setTraceProtocol] = useState<'ICMP' | 'UDP'>('ICMP');
  const [settings, setSettings] = useState<Settings>({
    repeatCount: 1000,
    interval: 500,
    payloadSize: 64,
    timeout: 500,
    ttl: 255,
    repeatOrder: 'robin',
    periodicExecution: false,
    periodicInterval: 60,
    hideOnMinimize: false,
    saveSettingsOnExit: true,
    saveAsCsv: true,
    autoDeleteResults: true,
    maxResults: 1000,
    flashTrayIcon: true,
    prohibitFragmentation: false,
    ng: {
      changeTrayIcon: true,
      showPopup: true,
      playSound: false,
      soundFile: "",
      launchProgram: true,
      programPath: "C:\\TOOL\\ExSMTP\\ExSMTP.exe",
      programOptions: "-R Server-Report.ini -B \"サーバ障害\"",
      programWorkingDir: "C:\\TOOL\\ExSMTP\\",
      executeOnDelay: false,
      delayMs: 500,
      onceOnly: false,
      notIfPreviousNg: true,
      notUntilCountReached: true,
      countToNotify: 3,
      countConsecutiveOnly: true,
      notifyOnIntervalOnly: false,
    },
    logs: {
      autoSave: true,
      savePath: "D:\\ping",
      fileNameSetting: 'dated',
      fixedName: "ExPing.log",
      prefix: "ExPing",
      extension: "LOG",
    }
  });
  const [platform, setPlatform] = useState<string>("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [showExPingInput, setShowExPingInput] = useState(false);
  const [exPingText, setExPingText] = useState("");
  const [isInputError, setIsInputError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useRef(true);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const threshold = 10;
    isAtBottom.current = scrollHeight - scrollTop - clientHeight < threshold;
  };

  const selectFile = async (type: 'sound' | 'program') => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: type === 'sound' ? [{ name: 'Sound', extensions: ['wav', 'mp3'] }] : [{ name: 'Executable', extensions: ['exe', 'app', 'sh', 'bat', 'cmd'] }]
      });
      if (selected && !Array.isArray(selected)) {
        if (type === 'sound') {
          setSettings({ ...settings, ng: { ...settings.ng, soundFile: selected } });
        } else {
          setSettings({ ...settings, ng: { ...settings.ng, programPath: selected } });
        }
      }
    } catch (e) {
      console.error("File selection error", e);
    }
  };

  const selectDir = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    try {
      const selected = await open({
        multiple: false,
        directory: true,
      });
      if (selected && !Array.isArray(selected)) {
        setSettings({ ...settings, ng: { ...settings.ng, programWorkingDir: selected } });
      }
    } catch (e) {
      console.error("Directory selection error", e);
    }
  };

  const playSound = async (filePath: string) => {
    if (!filePath) return;
    try {
      const bytes = await invoke<number[]>("read_file_bytes", { path: filePath });
      const uint8 = new Uint8Array(bytes);
      let mimeType = 'audio/wav';
      if (filePath.toLowerCase().endsWith('.mp3')) {
        mimeType = 'audio/mpeg';
      }
      const blob = new Blob([uint8], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (e) {
      console.error("Audio error", e);
    }
  };

  useEffect(() => {
    invoke<string>("get_platform").then(setPlatform);

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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

  const parseExPingContent = async (text: string) => {
    const lines = text.split('\n');
    const newTargets: Target[] = [];
    const invalidHosts: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("‘") || trimmed.startsWith("'")) continue;

      let host = trimmed;
      let remarks = "";

      if (trimmed.includes(" ")) {
        const firstSpace = trimmed.indexOf(" ");
        host = trimmed.slice(0, firstSpace).trim();
        remarks = trimmed.slice(firstSpace + 1).trim();
      }

      if (host) {
        try {
          await invoke("validate_host", { host });
          newTargets.push({ host, remarks });
        } catch (e) {
          invalidHosts.push(`${host} (${e})`);
        }
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

  const removeTarget = (t: string) => {
    setTargets(targets.filter(item => item.host !== t));
  };

  const runTraceRoute = async () => {
    setIsTracing(true);
    const newTraceResults: TraceResult[] = [];

    for (const target of targets) {
      try {
        const res = await invoke<TraceResult>("traceroute_target", {
          target: target.host,
          timeoutMs: settings.timeout,
          payloadSize: settings.payloadSize,
          maxHops: 30,
          protocol: traceProtocol
        });
        newTraceResults.push(res);
      } catch (e) {
        console.error("Trace error", e);
      }
    }

    setTraceResults(newTraceResults);
    setIsTracing(false);
  };

  useEffect(() => {
    let interval: number | undefined;
    let count = 0;

    if (isPinging) {
      const runPing = async () => {
        if (settings.repeatCount > 0 && count >= settings.repeatCount) {
          setIsPinging(false);
          return;
        }

        const promises = targets.map(target =>
          invoke<PingResult>("ping_target", {
            target: target.host,
            remarks: target.remarks,
            timeoutMs: settings.timeout,
            payloadSize: settings.payloadSize,
            ttl: settings.ttl
          })
        );

        try {
          const newResults = await Promise.all(promises);
          setResults(prev => {
            const combined = [...prev, ...newResults];
            if (settings.autoDeleteResults && combined.length > settings.maxResults) {
              return combined.slice(-settings.maxResults);
            }
            return combined.slice(-1000);
          });

          setTargetStats(prev => {
            const next = { ...prev };
            newResults.forEach(res => {
              const stats = next[res.target] || {
                target: res.target,
                executedCount: 0,
                failedCount: 0,
                minTime: null,
                maxTime: null,
                avgTime: null,
                totalTime: 0,
                successCount: 0,
                isLastFailed: false,
              };

              stats.executedCount++;
              if (res.time_ms !== null) {
                stats.successCount++;
                stats.totalTime += res.time_ms;
                stats.minTime = stats.minTime === null ? res.time_ms : Math.min(stats.minTime, res.time_ms);
                stats.maxTime = stats.maxTime === null ? res.time_ms : Math.max(stats.maxTime, res.time_ms);
                stats.avgTime = stats.totalTime / stats.successCount;
                stats.isLastFailed = false;
              } else {
                stats.failedCount++;
                stats.isLastFailed = true;
              }
              next[res.target] = stats;
            });
            return next;
          });

          setTargetNgStats(prev => {
            const nextStats = { ...prev };
            let alertToSet: { target: string, timestamp: string, reason: string } | null = null;

            newResults.forEach(res => {
              const isNg = res.time_ms === null;
              const current = nextStats[res.target] || { consecutiveCount: 0, alerted: false };
              const nextConsecutive = isNg ? current.consecutiveCount + 1 : 0;
              let nextAlerted = isNg ? current.alerted : false;

              if (isNg && settings.ng.showPopup) {
                const threshold = settings.ng.notUntilCountReached ? settings.ng.countToNotify : 1;
                let shouldTrigger = false;

                if (nextConsecutive === threshold) {
                  shouldTrigger = true;
                }

                if (settings.ng.onceOnly && nextAlerted) {
                  shouldTrigger = false;
                }

                if (shouldTrigger) {
                  alertToSet = {
                    target: res.target,
                    timestamp: res.timestamp,
                    reason: res.status
                  };
                  nextAlerted = true;
                }
              } else if (!isNg) {
                nextAlerted = false;
              }

              nextStats[res.target] = { consecutiveCount: nextConsecutive, alerted: nextAlerted };
            });

            if (alertToSet) {
              setActiveAlert(current => current || alertToSet);
              if (settings.ng.playSound && settings.ng.soundFile) {
                playSound(settings.ng.soundFile);
              }
            }
            return nextStats;
          });

          count++;
        } catch (e) {
          console.error("Ping error", e);
        }
      };

      runPing();
      interval = setInterval(runPing, settings.interval);
    }

    return () => clearInterval(interval);
  }, [isPinging, targets, settings]);

  useEffect(() => {
    if (scrollRef.current && isAtBottom.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [results]);

  const handleSave = async () => {
    if (activeTab === 'targets') {
      try {
        await invoke("save_targets", { targets });
        alert("ExPing.def を保存しました。");
      } catch (e) {
        console.error("Save targets error:", e);
        alert("保存に失敗しました(targets): " + JSON.stringify(e));
      }
    } else if (activeTab === 'results') {
      if (results.length === 0) {
        alert("保存する結果がありません。");
        return;
      }
      try {
        const path = await save({
          filters: [{
            name: 'CSV',
            extensions: ['csv']
          }, {
            name: 'Text',
            extensions: ['txt']
          }],
          defaultPath: 'PingResults.csv'
        });
        if (path) {
          const header = "ステータス,日時,対象,IPアドレス,応答時間(ms),詳細,備考\n";
          const content = results.map(r =>
            `${r.status.startsWith("OK") ? "OK" : "NG"},${r.timestamp},${r.target},${r.ip},${r.time_ms !== null ? r.time_ms.toFixed(2) : "-"},${r.status},${r.remarks}`
          ).join('\n');
          await invoke("save_text_file", { path, content: header + content });
          alert("保存しました。");
        }
      } catch (e) {
        console.error("Save results error:", e);
        alert("保存に失敗しました(results): " + JSON.stringify(e));
      }
    } else if (activeTab === 'stats') {
      if (targets.length === 0) {
        alert("保存する統計情報がありません。");
        return;
      }
      try {
        const path = await save({
          filters: [{
            name: 'CSV',
            extensions: ['csv']
          }],
          defaultPath: 'PingStats.csv'
        });
        if (path) {
          const header = "対象,実施回数,失敗回数,失敗率(%),最短時間(ms),最大時間(ms),平均時間(ms)\n";
          const content = targets.map(t => {
            const s = targetStats[t.host];
            if (!s) return `${t.host},0,0,0,-,-,-`;
            const failRate = ((s.failedCount / s.executedCount) * 100).toFixed(1);
            return `${s.target},${s.executedCount},${s.failedCount},${failRate},${s.minTime?.toFixed(2) || "-"},${s.maxTime?.toFixed(2) || "-"},${s.avgTime?.toFixed(2) || "-"}`;
          }).join('\n');
          await invoke("save_text_file", { path, content: header + content });
          alert("保存しました。");
        }
      } catch (e) {
        console.error("Save stats error:", e);
        alert("保存に失敗しました(stats): " + JSON.stringify(e));
      }
    } else if (activeTab === 'trace') {
      if (traceResults.length === 0) {
        alert("保存するTraceRoute結果がありません。");
        return;
      }
      try {
        const path = await save({
          filters: [{
            name: 'Text',
            extensions: ['txt']
          }],
          defaultPath: 'TraceRouteResults.txt'
        });
        if (path) {
          let content = "";
          traceResults.forEach(res => {
            content += `Target: ${res.target} (${res.timestamp})\n`;
            content += `Ping: ${res.ping_ok ? "OK" : "NG"}\n`;
            res.hops.forEach(h => {
              content += `${h.ttl}\t${h.ip || "*"}\t${h.time_ms !== null ? h.time_ms.toFixed(2) + "ms" : "*"}\n`;
            });
            content += "----------------------------------------\n";
          });
          await invoke("save_text_file", { path, content });
          alert("保存しました。");
        }
      } catch (e) {
        console.error("Save trace error:", e);
        alert("保存に失敗しました(trace): " + JSON.stringify(e));
      }
    }
  };

  const handleProtocolChange = async (proto: 'ICMP' | 'UDP') => {
    if (proto === 'UDP' && platform === 'windows') {
      const admin = await invoke<boolean>("is_admin");
      if (!admin) {
        alert("Windows UDP Traceroute実行には管理者権限が必要です。管理者権限で実行してください。");
        return;
      }
    }
    setTraceProtocol(proto);
  };

  return (
    <div className="app-container">
      <Header showSettings={showSettings} setShowSettings={setShowSettings} />
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} setShowSettings={setShowSettings} handleSave={handleSave} />

      <div className="tab-content">
        {showSettings && (
          <SettingsModal
            settings={settings}
            setSettings={setSettings}
            setShowSettings={setShowSettings}
            selectFile={selectFile}
            selectDir={selectDir}
            playSound={playSound}
          />
        )}

        {!showSettings && activeTab === 'targets' && (
          <TargetsTab
            targets={targets}
            newTarget={newTarget}
            setNewTarget={setNewTarget}
            newRemarks={newRemarks}
            setNewRemarks={setNewRemarks}
            isInputError={isInputError}
            addTarget={addTarget}
            removeTarget={removeTarget}
            showExPingInput={showExPingInput}
            setShowExPingInput={setShowExPingInput}
            exPingText={exPingText}
            setExPingText={setExPingText}
            handleExPingApply={handleExPingApply}
            handleTargetListDrop={handleTargetListDrop}
            handleDrop={handleDrop}
          />
        )}

        {!showSettings && activeTab === 'results' && (
          <ResultsTab
            isPinging={isPinging}
            setIsPinging={setIsPinging}
            results={results}
            setResults={setResults}
            setTargetStats={setTargetStats}
            scrollRef={scrollRef}
            handleScroll={handleScroll}
          />
        )}

        {!showSettings && activeTab === 'stats' && (
          <StatsTab targets={targets} targetStats={targetStats} />
        )}

        {!showSettings && activeTab === 'trace' && (
          <TraceRouteTab
            runTraceRoute={runTraceRoute}
            isTracing={isTracing}
            traceProtocol={traceProtocol}
            onProtocolChange={handleProtocolChange}
            traceResults={traceResults}
            setTraceResults={setTraceResults}
          />
        )}
      </div>

      <StatsBar targetCount={targets.length} resultCount={results.length} currentTime={currentTime} />
      <AlertOverlay activeAlert={activeAlert} setActiveAlert={setActiveAlert} />
    </div>
  );
}

export default App;
