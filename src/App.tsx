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
        <div style={{ fontWeight: 'bold', letterSpacing: '2px' }}>EX-PING</div>
      </header>

      <div className="tab-bar">
        <div className="tab active">Ping Statistics</div>
        <div className="tab">Environment</div>
        <div className="tab">TraceRoute</div>
      </div>

      <div className="toolbar">
        <div className="input-group">
          <input
            type="text"
            placeholder="IP Address..."
            value={newTarget}
            onChange={(e) => setNewTarget(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTarget()}
          />
          <button onClick={addTarget}>Add Target</button>
        </div>
        <button
          onClick={() => setIsPinging(!isPinging)}
          style={{ background: isPinging ? '#cf6679' : '#4caf50' }}
        >
          {isPinging ? "Stop Pinging" : "Start Pinging"}
        </button>
        <button onClick={() => setResults([])}>Clear Results</button>
      </div>

      <div className="table-container" ref={scrollRef}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '80px' }}>Status</th>
              <th style={{ width: '180px' }}>Timestamp</th>
              <th>Target</th>
              <th>IP Address</th>
              <th>Response Time</th>
              <th>Details</th>
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
        <div>Targets: {targets.length}</div>
        <div>Total Packets: {results.length}</div>
        <div>Active Targets: {targets.join(", ")}</div>
      </div>
    </div>
  );
}

export default App;
