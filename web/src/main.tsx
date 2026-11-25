import { pwa } from './fas-capabilities/pwa';
import { player } from './services/player';
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Hold PWA updates while a stream is playing.
pwa.addBusyGuard(() => player.state.isPlaying);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);