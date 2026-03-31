import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import LandingPage from './LandingPage';
import GraphView from './components/GraphView/GraphView';
import { EntityPanel } from './components/EntityPanel';
import { useGraphStore } from './store/graph.store';
const qc = new QueryClient();
export default function App(){ const open = !!useGraphStore((s)=>s.selectedEntityId); return <QueryClientProvider client={qc}><BrowserRouter><div style={{height:'100vh',display:'grid',gridTemplateRows:'auto 1fr'}}><Routes><Route path="/" element={<LandingPage/>}/><Route path="/entity/:id" element={<GraphView/>}/><Route path="/flow/:fromId/:toId" element={<GraphView/>}/></Routes><EntityPanel open={open}/></div></BrowserRouter></QueryClientProvider>; }
