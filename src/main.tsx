import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { initI18n } from "./i18n";
import { DirectionProvider } from "./i18n/direction-provider";
import { loadSession } from "./auth/store";
import { router } from "./router";
import { initTheme } from "./theme/theme";
import "./index.css";

initTheme();
// The router's guards decide the first page from the session.
loadSession();

initI18n().then(() => {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <DirectionProvider>
        <RouterProvider router={router} />
      </DirectionProvider>
    </React.StrictMode>,
  );
});
