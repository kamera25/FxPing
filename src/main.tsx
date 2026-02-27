import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/tokens.css";
import "./styles/global.css";

if (import.meta.env.PROD || true) { // We can adjust this if the user wants devtools in dev
  // Disable right-click context menu
  document.addEventListener("contextmenu", (e) => e.preventDefault());

  // Disable keyboard shortcuts for reload and devtools
  document.addEventListener("keydown", (e) => {
    // F5 or Ctrl/Cmd + R (Reload)
    if (
      e.key === "F5" ||
      ((e.ctrlKey || e.metaKey) && e.key === "r")
    ) {
      e.preventDefault();
    }

    // F12, Ctrl+Shift+I, Cmd+Option+I (DevTools)
    // Ctrl+Shift+J, Cmd+Option+J (Console)
    // Ctrl+Shift+C (Inspect)
    if (
      e.key === "F12" ||
      ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c")) ||
      (e.metaKey && e.altKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j"))
    ) {
      e.preventDefault();
    }
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
