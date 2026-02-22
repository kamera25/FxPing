import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

interface PingResult {
  target: string;
  ip: string;
  time_ms: number | null;
  status: string;
  timestamp: string;
}

interface Settings {
  repeatCount: number;
  interval: number;
  payloadSize: number;
  timeout: number;
  ttl: number;
  repeatOrder: 'sequential' | 'robin';
  periodicExecution: boolean;
  periodicInterval: number;
}

function App() {
  const [activeTab, setActiveTab] = useState("results");
  const [targets, setTargets] = useState<string[]>(["127.0.0.1", "8.8.8.8"]);
  const [newTarget, setNewTarget] = useState("");
  const [results, setResults] = useState<PingResult[]>([]);
  const [isPinging, setIsPinging] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    repeatCount: 1000,
    interval: 500,
    payloadSize: 64,
    timeout: 500,
    ttl: 255,
    repeatOrder: 'robin',
    periodicExecution: false,
    periodicInterval: 60,
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  const addTarget = () => {
    if (newTarget && !targets.includes(newTarget)) {
      setTargets([...targets, newTarget]);
      setNewTarget("");
    }
  };

  const removeTarget = (t: string) => {
    setTargets(targets.filter(item => item !== t));
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
            target,
            timeoutMs: settings.timeout,
            payloadSize: settings.payloadSize,
            ttl: settings.ttl
          })
        );

        try {
          const newResults = await Promise.all(promises);
          setResults(prev => [...prev, ...newResults].slice(-1000));
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

  return (
    <div className="app-container">
      <header>
        <div style={{ fontWeight: 'bold', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--primary)', fontSize: '20px' }}>🌸</span>
          ExPing - Continuously Ping
        </div>
      </header>

      <div className="tab-bar">
        <div className={`tab ${activeTab === 'targets' ? 'active' : ''}`} onClick={() => setActiveTab('targets')}>対象</div>
        <div className={`tab ${activeTab === 'env' ? 'active' : ''}`} onClick={() => setActiveTab('env')}>環境</div>
        <div className={`tab ${activeTab === 'results' ? 'active' : ''}`} onClick={() => setActiveTab('results')}>Ping 結果</div>
        <div className={`tab ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>Ping 統計</div>
        <div className={`tab ${activeTab === 'trace' ? 'active' : ''}`} onClick={() => setActiveTab('trace')}>TraceRoute</div>
      </div>

      <div className="tab-content">
        {activeTab === 'targets' && (
          <div className="target-list">
            <div className="toolbar" style={{ margin: '0 0 16px 0', borderRadius: '4px' }}>
              <div className="input-group">
                <input
                  type="text"
                  placeholder="IPアドレスまたはホスト名..."
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTarget()}
                />
                <button onClick={addTarget}>対象を追加</button>
              </div>
            </div>
            {targets.map(t => (
              <div key={t} className="target-item">
                <span>{t}</span>
                <div className="target-actions">
                  <button className="btn-small btn-danger" onClick={() => removeTarget(t)}>削除</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'env' && (
          <div className="settings-container">
            <div className="settings-section">
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

            <div className="settings-section">
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

            <div className="settings-section">
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

        {activeTab === 'results' && (
          <>
            <div className="toolbar">
              <button
                onClick={() => setIsPinging(!isPinging)}
                style={{ background: isPinging ? '#cf6679' : '#4caf50', minWidth: '100px' }}
              >
                {isPinging ? "■ 停止" : "▶ 開始"}
              </button>
              <button onClick={() => setResults([])}>履歴クリア</button>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {(activeTab === 'stats' || activeTab === 'trace') && (
          <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>
            {activeTab === 'stats' ? "統計機能は準備中です" : "経路追跡機能は準備中です"}
          </div>
        )}
      </div>

      <div className="stats-bar">
        <div>対象数: {targets.length}</div>
        <div>パケット合計: {results.length}</div>
        <div style={{ flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          実行中の対象: {targets.join(", ")}
        </div>
      </div>
    </div>
  );
}

export default App;
