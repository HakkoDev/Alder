import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import App from "./App";
import { getPreferences, startPreferencesBridge, subscribePreferences } from "./lib/preferences";
import { installProductionWebviewGuards } from "./lib/production-webview";
import { applyPreferences } from "./lib/theme";
import "./styles.css";

installProductionWebviewGuards();
applyPreferences(getPreferences());
subscribePreferences(() => applyPreferences(getPreferences()));
startPreferencesBridge();
const root = document.getElementById("root");
if (!root) throw new Error("Alder: missing root element");
ReactDOM.createRoot(root).render(
    <React.StrictMode>
        <App />
        <Toaster
            position="bottom-right"
            theme="system"
            richColors
            closeButton
            visibleToasts={4}
        />
    </React.StrictMode>,
);
