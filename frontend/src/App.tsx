import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Setup from "./pages/Setup";
import Demo from "./pages/Demo";
import Audit from "./pages/Audit";
import Security from "./pages/Security";
import CompetitiveDemo from "./pages/CompetitiveDemo";
import NotFound from "./pages/NotFound";
import WebStore from "./pages/Shop";
import Checkout from "./pages/Checkout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/shop" element={<WebStore />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/security" element={<Security />} />
          <Route path="/demo-script" element={<CompetitiveDemo />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
