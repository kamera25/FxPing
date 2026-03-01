import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import styles from "./App.module.css";

// Types
import { TraceResult, TraceHop } from "./types";

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

// Utils
import {
  formatPingResultsCsvRows,
  formatStatsCsvRows,
  formatTraceResultsText
} from "./utils/logic";

// Store & Hooks
import { usePingStore } from "./store/pingStore";
import { useTargetStore } from "./store/targetStore";
import { useTraceStore } from "./store/traceStore";
import { useSettingsStore } from "./store/settingsStore";
import { useUIStore } from "./store/uiStore";
import { useSettings } from "./hooks/useSettings";
import { useTargets } from "./hooks/useTargets";
import { usePingEngine } from "./hooks/usePingEngine";
import { useAutoSave } from "./hooks/useAutoSave";

function App() {
  const { activeTab, setCurrentTime } = useUIStore();
  const { targets } = useTargetStore();
  const { results, targetStats, isRunActive } = usePingStore();
  const { traceResults, setTraceResults } = useTraceStore();
  const { showSettings } = useSettingsStore();

  const { initPlatform, loadSettingsFromIni } = useSettings();
  const { loadDefTargets } = useTargets();
  useAutoSave();

  useEffect(() => {
    loadDefTargets();
    loadSettingsFromIni();
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useRef(true);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const threshold = 10;
    isAtBottom.current = scrollHeight - scrollTop - clientHeight < threshold;
  };

  useEffect(() => {
    const unlistenStart = listen<TraceResult>("trace-start", (event) => {
      setTraceResults(prev => {
        const exists = prev.some(r => r.target === event.payload.target);
        if (exists) {
          return prev.map(r => r.target === event.payload.target ? event.payload : r);
        }
        return [...prev, event.payload];
      });
    });

    const unlistenHop = listen<TraceHop>("trace-hop", (event) => {
      setTraceResults(prev => {
        return prev.map(r => {
          if (r.target === event.payload.target) {
            const existingHopIndex = r.hops.findIndex(h => h.ttl === event.payload.ttl);
            let nextHops = [...r.hops];
            if (existingHopIndex > -1) {
              nextHops[existingHopIndex] = event.payload;
            } else {
              nextHops.push(event.payload);
            }
            nextHops.sort((a, b) => a.ttl - b.ttl);
            return { ...r, hops: nextHops };
          }
          return r;
        });
      });
    });

    const unlistenPing = listen<{ target: string, ping_ok: boolean }>("trace-ping", (event) => {
      setTraceResults(prev => {
        return prev.map(r => {
          if (r.target === event.payload.target) {
            return { ...r, ping_ok: event.payload.ping_ok };
          }
          return r;
        });
      });
    });

    return () => {
      unlistenStart.then(u => u());
      unlistenHop.then(u => u());
      unlistenPing.then(u => u());
    };
  }, [setTraceResults]);

  useEffect(() => {
    initPlatform();

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const preventDefault = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", preventDefault);
    window.addEventListener("drop", preventDefault);

    return () => {
      clearInterval(timer);
      window.removeEventListener("dragover", preventDefault);
      window.removeEventListener("drop", preventDefault);
    };
  }, [initPlatform, setCurrentTime]);

  useEffect(() => {
    // Show the window after the frontend has rendered to avoid white flash
    // We use a custom Rust command to ensure direct access to window show logic
    invoke("show_main_window").catch((err) => {
      console.error("Failed to show window:", err);
    });
  }, []);

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
          filters: [{ name: 'CSV', extensions: ['csv'] }, { name: 'Text', extensions: ['txt'] }],
          defaultPath: 'PingResults.csv'
        });
        if (path) {
          const header = "ステータス,日時,対象,IPアドレス,応答時間(ms),詳細,備考\n";
          const content = header + formatPingResultsCsvRows(results);
          await invoke("save_text_file", { path, content });
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
          filters: [{ name: 'CSV', extensions: ['csv'] }],
          defaultPath: 'PingStats.csv'
        });
        if (path) {
          const header = "対象,実施回数,失敗回数,失敗率(%),最短時間(ms),最大時間(ms),平均時間(ms)\n";
          const content = header + formatStatsCsvRows(targets, targetStats);
          await invoke("save_text_file", { path, content });
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
          filters: [{ name: 'Text', extensions: ['txt'] }],
          defaultPath: 'TraceRouteResults.txt'
        });
        if (path) {
          const content = formatTraceResultsText(traceResults);
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
    <div className={styles.appContainer}>
      <Header />
      <TabBar handleSave={handleSave} />

      <div className={styles.tabContent}>
        {showSettings && (
          <SettingsModal />
        )}

        {!showSettings && activeTab === 'targets' && (
          <TargetsTab />
        )}

        {!showSettings && activeTab === 'results' && (
          <ResultsTab
            scrollRef={scrollRef}
            handleScroll={handleScroll}
          />
        )}

        {!showSettings && activeTab === 'stats' && (
          <StatsTab />
        )}

        {!showSettings && activeTab === 'trace' && (
          <TraceRouteTab />
        )}
      </div>

      <StatsBar />
      <AlertOverlay />
    </div>
  );
}

export default App;
