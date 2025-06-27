
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Redacoes from "./pages/Redacoes";
import RedacaoDetalhes from "./pages/RedacaoDetalhes";
import Temas from "./pages/Temas";
import TemaDetalhes from "./pages/TemaDetalhes";
import Videoteca from "./pages/Videoteca";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/redacoes" element={<Redacoes />} />
          <Route path="/redacoes/:id" element={<RedacaoDetalhes />} />
          <Route path="/temas" element={<Temas />} />
          <Route path="/temas/:id" element={<TemaDetalhes />} />
          <Route path="/videoteca" element={<Videoteca />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
