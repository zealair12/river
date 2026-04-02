import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import LandingPage from './LandingPage';
import EntityPage from './components/EntityPage';
import StockPage from './components/StockPage';
import { TraceBackPanel } from './components/TraceBackPanel';
import { TraceBackProvider, useTraceBack } from './context/TraceBackContext';

const qc = new QueryClient();

function AppShell() {
  const { panelOpen } = useTraceBack();
  const gutter = panelOpen ? 400 : 32;

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        minHeight: '100vh',
        maxWidth: '100vw',
        background: '#060f0b',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: '100vh',
          overflow: 'auto',
          boxSizing: 'border-box',
          transition: 'flex-basis 0.28s cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/entity/:id" element={<EntityPage />} />
          <Route path="/stock/:symbol" element={<StockPage />} />
        </Routes>
      </div>
      <div
        style={{
          width: gutter,
          flexShrink: 0,
          transition: 'width 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          borderLeft: panelOpen ? '1px solid rgba(0,229,200,0.14)' : 'none',
          boxSizing: 'border-box',
          background: 'rgba(6, 15, 11, 0.98)'
        }}
      >
        <TraceBackPanel />
      </div>
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
