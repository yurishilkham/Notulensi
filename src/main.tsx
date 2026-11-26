import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/public-sans";
import "@fontsource-variable/source-serif-4";
import App from "./App";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Elemen root tidak ditemukan.");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
