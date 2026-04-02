import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchBar } from './components/SearchBar';
import WorldMap from './components/WorldMap';
import { useTraceBack } from './context/TraceBackContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { registerPageContext } = useTraceBack();

  useEffect(() => {
    registerPageContext({ page: 'landing', surface: 'world_map' });
    return () => registerPageContext(null);
  }, [registerPageContext]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        isolation: 'isolate'
      }}
    >
      <WorldMap />

      {/* Search: horizontal center; vertical center of map area below top chrome */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 'clamp(200px, calc(45vh + 40px), 58vh)',
          transform: 'translate(-50%, -50%)',
          zIndex: 200,
          width: 'min(760px, calc(100vw - 40px))',
          padding: '0 20px',
          pointerEvents: 'none'
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <SearchBar onEntitySelected={(entityId) => navigate(`/entity/${encodeURIComponent(entityId)}`)} />
        </div>
      </div>
    </div>
  );
}
