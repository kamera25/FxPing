import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import "./App.css";

interface PingResult {
  target: string;
  ip: string;
  time_ms: number | null;
  status: string;
  timestamp: string;
  remarks: string;
}

interface Target {
  host: string;
  remarks: string;
}

interface TraceHop {
  ttl: number;
  ip: string;
  fqdn?: string | null;
  time_ms: number | null;
}

interface TraceResult {
  target: string;
  ping_ok: boolean;
  hops: TraceHop[];
  timestamp: string;
}

interface TargetStats {
  target: string;
  executedCount: number;
  failedCount: number;
  minTime: number | null;
  maxTime: number | null;
  avgTime: number | null;
  totalTime: number;
  successCount: number;
}

const formatDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}/${m}/${d} ${h}:${min}:${s}`;
};

interface Settings {
  repeatCount: number;
  interval: number;
  payloadSize: number;
  timeout: number;
  ttl: number;
  repeatOrder: 'sequential' | 'robin';
  periodicExecution: boolean;
  periodicInterval: number;
  hideOnMinimize: boolean;
  saveSettingsOnExit: boolean;
  saveAsCsv: boolean;
  autoDeleteResults: boolean;
  maxResults: number;
  flashTrayIcon: boolean;
  prohibitFragmentation: boolean;
}

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
  });
  const [platform, setPlatform] = useState<string>("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState("general");
  const [showExPingInput, setShowExPingInput] = useState(false);
  const [exPingText, setExPingText] = useState("");
  const [isInputError, setIsInputError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    invoke<string>("get_platform").then(setPlatform);
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

  const handleExPingApply = async () => {
    const lines = exPingText.split('\n');
    const newTargets: Target[] = [];
    const invalidHosts: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let host = trimmed;
      let remarks = "";

      if (trimmed.includes("#")) {
        const parts = trimmed.split("#");
        host = parts[0].trim();
        remarks = parts[1].trim();
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

    if (invalidHosts.length > 0) {
      alert(`The following targets were skipped due to validation errors:\n${invalidHosts.join('\n')}`);
    }

    if (newTargets.length > 0) {
      setTargets(newTargets);
      setShowExPingInput(false);
      setExPingText("");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

    // Handle file drop
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

    // Handle text drop
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
            return combined.slice(-1000); // Fail-safe limit
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
              };

              stats.executedCount++;
              if (res.time_ms !== null) {
                stats.successCount++;
                stats.totalTime += res.time_ms;
                stats.minTime = stats.minTime === null ? res.time_ms : Math.min(stats.minTime, res.time_ms);
                stats.maxTime = stats.maxTime === null ? res.time_ms : Math.max(stats.maxTime, res.time_ms);
                stats.avgTime = stats.totalTime / stats.successCount;
              } else {
                stats.failedCount++;
              }
              next[res.target] = stats;
            });
            return next;
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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [results]);

  const handleSave = async () => {
    console.log("handleSave triggered for tab:", activeTab);
    if (activeTab === 'targets') {
      try {
        console.log("Saving targets:", targets);
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
        console.log("Selected save path:", path);
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
        console.log("Selected save path:", path);
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
        console.log("Selected save path:", path);
        if (path) {
          let content = "";
          traceResults.forEach(res => {
            content += `Target: ${res.target} (${res.timestamp})\n`;
            content += `Ping: ${res.ping_ok ? "OK" : "NG"}\n`;
            res.hops.forEach(h => {
              content += `${h.ttl}\t${h.ip}\t${h.time_ms !== null ? h.time_ms.toFixed(2) + "ms" : "*"}\n`;
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

  return (
    <div className="app-container">
      <header>
        <div style={{ fontWeight: 'bold', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--primary)', fontSize: '20px' }}>🌸</span>
          FxPing - Continuously Ping
        </div>
        <button
          className={`settings-button ${showSettings ? 'active' : ''}`}
          onClick={() => setShowSettings(!showSettings)}
          title="設定"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.81,11.69,4.81,12c0,0.31,0.02,0.65,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.5c-1.93,0-3.5-1.57-3.5-3.5 s1.57-3.5,3.5-3.5s3.5,1.57,3.5,3.5S13.93,15.5,12,15.5z" />
          </svg>
        </button>
      </header>

      <div className="tab-bar">
        <div style={{ display: 'flex' }}>
          <div className={`tab ${activeTab === 'targets' ? 'active' : ''}`} onClick={() => { setActiveTab('targets'); setShowSettings(false); }}>対象</div>
          <div className={`tab ${activeTab === 'results' ? 'active' : ''}`} onClick={() => { setActiveTab('results'); setShowSettings(false); }}>Ping 結果</div>
          <div className={`tab ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => { setActiveTab('stats'); setShowSettings(false); }}>Ping 統計</div>
          <div className={`tab ${activeTab === 'trace' ? 'active' : ''}`} onClick={() => { setActiveTab('trace'); setShowSettings(false); }}>TraceRoute</div>
        </div>
        <div className="tab-bar-actions">
          <button className="save-button" onClick={handleSave} title="保存">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M17,3H5C3.89,3,3,3.9,3,5v14c0,1.1,0.89,2,2,2h14c1.1,0,2-0.9,2-2V7L17,3z M12,19c-1.66,0-3-1.34-3-3s1.34-3,3-3s3,1.34,3,3 S13.66,19,12,19z M15,9H5V5h10V9z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="tab-content">
        {showSettings && (
          <div className="settings-container" style={{ padding: 0 }}>
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)' }}>
              <h2 style={{ fontSize: '16px', color: 'var(--primary)', margin: 0 }}>環境設定</h2>
              <button className="btn-small" onClick={() => setShowSettings(false)}>閉じる</button>
            </div>

            <div className="settings-header-tabs">
              <div className={`settings-tab ${settingsTab === 'general' ? 'active' : ''}`} onClick={() => setSettingsTab('general')}>基本設定</div>
              <div className={`settings-tab ${settingsTab === 'ping' ? 'active' : ''}`} onClick={() => setSettingsTab('ping')}>Ping実行設定</div>
              <div className={`settings-tab ${settingsTab === 'logs' ? 'active' : ''}`} onClick={() => setSettingsTab('logs')}>ログ保存</div>
              <div className={`settings-tab ${settingsTab === 'ng' ? 'active' : ''}`} onClick={() => setSettingsTab('ng')}>NG時処理</div>
              <div className={`settings-tab ${settingsTab === 'ok' ? 'active' : ''}`} onClick={() => setSettingsTab('ok')}>OK時処理</div>
            </div>

            <div className="settings-content-body">
              {settingsTab === 'general' && (
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
              )}

              {settingsTab === 'ping' && (
                <div className="settings-container" style={{ padding: 0, background: 'transparent' }}>
                  <div className="settings-section" style={{ maxWidth: 'none' }}>
                    <h3>基本設定</h3>
                    <div className="settings-grid">
                      <div className="field-group">
                        <label>繰り返し回数:</label>
                        <div className="field-row">
                          <input type="number" value={settings.repeatCount} onChange={e => setSettings({ ...settings, repeatCount: parseInt(e.target.value) || 0 })} />
                          <span className="unit">回</span>
                        </div>
                      </div>
                      <div className="field-group">
                        <label>実行間隔:</label>
                        <div className="field-row">
                          <input type="number" value={settings.interval} onChange={e => setSettings({ ...settings, interval: parseInt(e.target.value) || 0 })} />
                          <span className="unit">ミリ秒</span>
                        </div>
                      </div>
                      <div className="field-group">
                        <label>ブロックサイズ:</label>
                        <div className="field-row">
                          <input type="number" value={settings.payloadSize} onChange={e => setSettings({ ...settings, payloadSize: parseInt(e.target.value) || 0 })} />
                          <span className="unit">バイト</span>
                        </div>
                      </div>
                      <div className="field-group">
                        <label>タイムアウト:</label>
                        <div className="field-row">
                          <input type="number" value={settings.timeout} onChange={e => setSettings({ ...settings, timeout: parseInt(e.target.value) || 0 })} />
                          <span className="unit">ミリ秒</span>
                        </div>
                      </div>
                      <div className="field-group">
                        <label>TTL:</label>
                        <div className="field-row">
                          <input type="number" value={settings.ttl} onChange={e => setSettings({ ...settings, ttl: parseInt(e.target.value) || 0 })} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="settings-section" style={{ maxWidth: 'none' }}>
                    <h3>繰り返し順序</h3>
                    <div className="radio-group">
                      <label className="checkbox-label">
                        <input type="radio" checked={settings.repeatOrder === 'sequential'} onChange={() => setSettings({ ...settings, repeatOrder: 'sequential' })} />
                        ソートしない (A-A-B-B)
                      </label>
                      <label className="checkbox-label">
                        <input type="radio" checked={settings.repeatOrder === 'robin'} onChange={() => setSettings({ ...settings, repeatOrder: 'robin' })} />
                        端末でソート (A-B-A-B)
                      </label>
                    </div>
                  </div>

                  <div className="settings-section" style={{ maxWidth: 'none' }}>
                    <label className="checkbox-label">
                      <input type="checkbox" checked={settings.periodicExecution} onChange={e => setSettings({ ...settings, periodicExecution: e.target.checked })} />
                      定期的に実行する
                    </label>
                    <div className="field-row" style={{ marginTop: '10px', marginLeft: '24px' }}>
                      <input type="number" disabled={!settings.periodicExecution} value={settings.periodicInterval} onChange={e => setSettings({ ...settings, periodicInterval: parseInt(e.target.value) || 0 })} />
                      <span className="unit">分間隔</span>
                    </div>
                  </div>
                </div>
              )}

              {['logs', 'ng', 'ok'].includes(settingsTab) && (
                <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>
                  この設定項目は準備中です
                </div>
              )}
            </div>
          </div>
        )}

        {!showSettings && activeTab === 'targets' && (
          <div className="target-list">
            <div className={`toolbar ${isInputError ? 'shake-animation' : ''}`} style={{ margin: '0 0 16px 0', borderRadius: '4px' }}>
              <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className={isInputError ? 'input-error' : ''}
                    style={{ flex: 2 }}
                    placeholder="IPアドレスまたはホスト名..."
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTarget()}
                  />
                  <input
                    type="text"
                    style={{ flex: 1 }}
                    placeholder="備考..."
                    value={newRemarks}
                    onChange={(e) => setNewRemarks(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTarget()}
                  />
                  <button onClick={addTarget}>対象を追加</button>
                </div>
              </div>
            </div>
            {targets.map(t => (
              <div key={t.host} className="target-item">
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', minWidth: '120px' }}>{t.host}</span>
                  <span style={{ opacity: 0.7, fontSize: '0.9em' }}>{t.remarks}</span>
                </div>
                <div className="target-actions">
                  <button className="btn-small btn-danger" onClick={() => removeTarget(t.host)}>削除</button>
                </div>
              </div>
            ))}

            <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
              {!showExPingInput ? (
                <button
                  className="btn-full"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)' }}
                  onClick={() => setShowExPingInput(true)}
                >
                  ExPing形式で定義…
                </button>
              ) : (
                <div className="exping-input-area">
                  <div style={{ marginBottom: '8px', fontSize: '12px', opacity: 0.7 }}>
                    ExPing形式で入力（例: 8.8.8.8 #google dns）
                  </div>
                  <textarea
                    style={{
                      width: '100%',
                      height: '120px',
                      background: 'rgba(0,0,0,0.2)',
                      color: 'white',
                      border: '1px solid var(--primary)',
                      borderRadius: '4px',
                      padding: '8px',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      resize: 'vertical'
                    }}
                    placeholder="8.8.8.8 #google dns 1&#10;8.8.4.4 #google dns 2"
                    value={exPingText}
                    onChange={(e) => setExPingText(e.target.value)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button style={{ flex: 1 }} onClick={handleExPingApply}>適応</button>
                    <button
                      style={{ flex: 1, background: 'rgba(255,255,255,0.1)' }}
                      onClick={() => { setShowExPingInput(false); setExPingText(""); }}
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!showSettings && activeTab === 'results' && (
          <>
            <div className="toolbar">
              <button
                onClick={() => setIsPinging(!isPinging)}
                style={{ background: isPinging ? '#cf6679' : '#4caf50', minWidth: '100px' }}
              >
                {isPinging ? "■ 停止" : "▶ 開始"}
              </button>
              <button onClick={() => { setResults([]); setTargetStats({}); }}>履歴クリア</button>
            </div>

            <div className="table-container" ref={scrollRef}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>ステータス</th>
                    <th style={{ width: '180px' }}>日時</th>
                    <th>対象</th>
                    <th>IPアドレス</th>
                    <th>応答時間</th>
                    <th>詳細</th>
                    <th>備考</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((res, i) => (
                    <tr key={i}>
                      <td className={res.status.startsWith("OK") ? "status-ok" : "status-ng"}>
                        {res.status.startsWith("OK") ? "● OK" : "✖ NG"}
                      </td>
                      <td>{res.timestamp}</td>
                      <td>{res.target}</td>
                      <td>{res.ip}</td>
                      <td>{res.time_ms !== null ? `${res.time_ms.toFixed(2)} ms` : "-"}</td>
                      <td style={{ opacity: 0.6, fontSize: '12px' }}>{res.status}</td>
                      <td>{res.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!showSettings && activeTab === 'stats' && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>対象</th>
                  <th style={{ width: '100px' }}>実施回数</th>
                  <th style={{ width: '100px' }}>失敗回数</th>
                  <th style={{ width: '100px' }}>失敗率</th>
                  <th style={{ width: '100px' }}>最短時間</th>
                  <th style={{ width: '100px' }}>最大時間</th>
                  <th style={{ width: '100px' }}>平均時間</th>
                </tr>
              </thead>
              <tbody>
                {targets.map(t => {
                  const target = t.host;
                  const s = targetStats[target];
                  if (!s) return (
                    <tr key={target}>
                      <td>{target}</td>
                      <td>0回</td>
                      <td>0回</td>
                      <td>0%</td>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                    </tr>
                  );
                  const failRate = ((s.failedCount / s.executedCount) * 100).toFixed(1);
                  return (
                    <tr key={target}>
                      <td>{s.target}</td>
                      <td>{s.executedCount}回</td>
                      <td style={{ color: s.failedCount > 0 ? '#ff4d4d' : 'inherit' }}>{s.failedCount}回</td>
                      <td style={{ color: s.failedCount > 0 ? '#ff4d4d' : 'inherit' }}>{failRate}%</td>
                      <td>{s.minTime !== null ? `${s.minTime.toFixed(2)} ms` : "-"}</td>
                      <td>{s.maxTime !== null ? `${s.maxTime.toFixed(2)} ms` : "-"}</td>
                      <td>{s.avgTime !== null ? `${s.avgTime.toFixed(2)} ms` : "-"}</td>
                    </tr>
                  );
                })}
                {targets.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                      対象が設定されていません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!showSettings && activeTab === 'trace' && (
          <>
            <div className="toolbar" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={runTraceRoute}
                disabled={isTracing}
                style={{ background: isTracing ? '#555' : 'var(--primary)', minWidth: '120px' }}
              >
                {isTracing ? "追跡中..." : "▶ TraceRoute 開始"}
              </button>

              {platform !== "windows" && (
                <div className="input-group" style={{ width: 'auto' }}>
                  <span style={{ fontSize: '12px', opacity: 0.7 }}>プロトコル:</span>
                  <select
                    value={traceProtocol}
                    onChange={(e) => setTraceProtocol(e.target.value as 'ICMP' | 'UDP')}
                    disabled={isTracing}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: 'var(--bg-secondary)',
                      color: 'white',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <option value="ICMP">ICMP</option>
                    <option value="UDP">UDP</option>
                  </select>
                </div>
              )}

              <button onClick={() => setTraceResults([])}>履歴クリア</button>
            </div>

            <div className="table-container" style={{ overflowX: 'auto', maxWidth: '100%' }}>
              <table style={{ minWidth: 'max-content', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ width: '150px', position: 'sticky', left: 0, background: 'var(--bg-secondary)', zIndex: 2 }}>対象ホスト</th>
                    <th style={{ width: '80px', position: 'sticky', left: '150px', background: 'var(--bg-secondary)', zIndex: 2 }}>Ping</th>
                    {(() => {
                      const maxHopsFound = Math.max(0, ...traceResults.map(r => r.hops.length));
                      return Array.from({ length: Math.max(1, maxHopsFound) }).map((_, i) => (
                        <th key={i} style={{ width: '150px' }}>Hop {i + 1}</th>
                      ));
                    })()}
                  </tr>
                </thead>
                <tbody>
                  {traceResults.map((res, i) => {
                    const maxHopsFound = Math.max(0, ...traceResults.map(r => r.hops.length));
                    return (
                      <tr key={i}>
                        <td style={{ position: 'sticky', left: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>{res.target}</td>
                        <td className={res.ping_ok ? "status-ok" : "status-ng"} style={{ position: 'sticky', left: '150px', background: 'var(--bg-secondary)', zIndex: 1 }}>
                          {res.ping_ok ? "OK" : "NG"}
                        </td>
                        {Array.from({ length: Math.max(1, maxHopsFound) }).map((_, j) => {
                          const hop = res.hops[j];
                          return (
                            <td key={j} style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                              {hop ? (
                                <>
                                  <div style={{ fontWeight: 'bold', color: hop.ip === "*" ? "#ff4d4d" : "inherit" }}>{hop.ip}</div>
                                  {hop.fqdn && <div style={{ opacity: 0.8, color: 'var(--primary)', fontStyle: 'italic' }}>{hop.fqdn}</div>}
                                  <div style={{ opacity: 0.6 }}>{hop.time_ms !== null ? `${hop.time_ms.toFixed(1)}ms` : "-"}</div>
                                </>
                              ) : "-"}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {traceResults.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                        TraceRouteを実行するには「開始」ボタンを押してください
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="stats-bar">
        <div>対象数: {targets.length}</div>
        <div>パケット合計: {results.length}</div>
        <div style={{ flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {formatDate(currentTime)}
        </div>
      </div>
    </div>
  );
}

export default App;
