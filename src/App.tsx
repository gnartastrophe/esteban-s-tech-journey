import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Index from "./pages/Index";
import AcademicsHCC from "./pages/AcademicsHCC";
import AcademicsBeyond from "./pages/AcademicsBeyond";
import FutureCareer from "./pages/FutureCareer";
import EmergingTech from "./pages/EmergingTech";
import WorksCited from "./pages/WorksCited";
import NotFound from "./pages/NotFound";

// The game is a big self-contained module; only load it when someone visits /game.
const GamePage = lazy(() => import("./pages/Game"));

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
          <Route
            path="/game"
            element={
              <Suspense fallback={<div className="fixed inset-0 bg-[#05040c]" />}>
                <GamePage />
              </Suspense>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
