
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { RBACProvider } from "./contexts/RBACContext";
import { AuthProvider } from "./contexts/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./styles/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <RBACProvider>
        <App />
      </RBACProvider>
    </AuthProvider>
  </QueryClientProvider>
);
  