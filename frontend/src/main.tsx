import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { initDataWedgeBridge } from "./services/datawedgeBridge";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Try to initialize DataWedge bridge at app start
initDataWedgeBridge();
