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

function App() {
  const [targets, setTargets] = useState<string[]>(["127.0.0.1", "8.8.8.8"]);
  const [newTarget, setNewTarget] = useState("");
  const [results, setResults] = useState<PingResult[]>([]);
  const [isPinging, setIsPinging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const addTarget = () => {
    if (newTarget && !targets.includes(newTarget)) {
      setTargets([...targets, newTarget]);
      setNewTarget("");
    }
  };

  useEffect(() => {
    let interval: number | undefined;

    if (isPinging) {
      const runPing = async () => {
        const promises = targets.map(target =>
          invoke<PingResult>("ping_target", { target })
        );

        try {
          const newResults = await Promise.all(promises);
          setResults(prev => [...prev, ...newResults].slice(-1000)); // Keep last 1000
        } catch (e) {
          console.error("Ping error", e);
        }
      };

      runPing();
      interval = setInterval(runPing, 2000);
    }

    return () => clearInterval(interval);
  }, [isPinging, targets]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [results]);

  return (
    <div className="app-container">
      <header>
        <div style={{ fontWeight: 'bold', letterSpacing: '2px' }}>EX-PING - 継続PINGツール</div>
      </header>

      <div className="tab-bar">
        <div className="tab active">Ping統計</div>
        <div className="tab">環境設定</div>
        <div className="tab">経路追跡</div>
      </div>

      <div className="toolbar">
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
        <button
          onClick={() => setIsPinging(!isPinging)}
          style={{ background: isPinging ? '#cf6679' : '#4caf50' }}
        >
          {isPinging ? "停止" : "開始"}
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

      <div className="stats-bar">
        <div>対象数: {targets.length}</div>
        <div>パケット合計: {results.length}</div>
        <div>実行中の対象: {targets.join(", ")}</div>
      </div>
    </div>
  );
}

export default App;
