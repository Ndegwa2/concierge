
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { RBACProvider } from "./contexts/RBACContext";
import { AuthProvider } from "./contexts/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./styles/index.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <RBACProvider>
        <App />
      </RBACProvider>
    </AuthProvider>
  </QueryClientProvider>
);
  