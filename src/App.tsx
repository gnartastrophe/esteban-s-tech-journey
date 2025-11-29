import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AcademicsHCC from "./pages/AcademicsHCC";
import AcademicsBeyond from "./pages/AcademicsBeyond";
import FutureCareer from "./pages/FutureCareer";
import EmergingTech from "./pages/EmergingTech";
import WorksCited from "./pages/WorksCited";
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
          <Route path="/academics-hcc" element={<AcademicsHCC />} />
          <Route path="/academics-beyond" element={<AcademicsBeyond />} />
          <Route path="/future-career" element={<FutureCareer />} />
          <Route path="/emerging-tech" element={<EmergingTech />} />
          <Route path="/works-cited" element={<WorksCited />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
