
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";
  import { supabaseUrl } from "./utils/supabase/info";

  // Debug: log supabase URL from module (safe — runs in module context)
  console.log('🚀 [MAIN] CareConnect App Starting...');
  console.log('🌐 [MAIN] VITE SUPABASE URL (from module):', supabaseUrl);
  console.log('🔍 [MAIN] Check console for Supabase client debug logs...');

  createRoot(document.getElementById("root")!).render(<App />);
  