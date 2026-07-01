
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { RBACProvider } from "./contexts/RBACContext";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <RBACProvider>
    <App />
  </RBACProvider>
);
  