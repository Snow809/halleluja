import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { Providers } from "./app/providers.tsx";
  import { BrowserRouter } from "react-router-dom";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <Providers>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Providers>
  );
