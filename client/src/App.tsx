import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import LandingPage from './LandingPage';
import EntityPage from './components/EntityPage';
import StockPage from './components/StockPage';
import { TraceBackPanel } from './components/TraceBackPanel';
import { TraceBackProvider, useTraceBack } from './context/TraceBackContext';

const qc = new QueryClient();

/** Width of fixed side panel + fixed caret (see TraceBackPanel). */
const PANEL_W = 368;
/** Full-height strip on the right edge toggles the Traceback panel (not only the chevron). */
const CARET_W = 32;

function AppShell() {
  const { panelOpen } = useTraceBack();
  const padRight = (panelOpen ? PANEL_W : 0) + CARET_W;

  return (
    <div style={{ minHeight: '100vh', width: '100%', maxWidth: '100vw', background: '#060f0b', position: 'relative' }}>
      <div
        style={{
          paddingRight: padRight,
          minHeight: '100vh',
          boxSizing: 'border-box',
          transition: 'padding-right 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
          width: '100%'
        }}
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/entity/:id" element={<EntityPage />} />
          <Route path="/stock/:symbol" element={<StockPage />} />
        </Routes>
      </div>
      <TraceBackPanel panelWidth={PANEL_W} caretWidth={CARET_W} />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <TraceBackProvider>
          <AppShell />
        </TraceBackProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
