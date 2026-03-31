import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
cytoscape.use(fcose);
export default function GraphView() { const ref = useRef<HTMLDivElement>(null); useEffect(()=>{ if(!ref.current) return; const cy = cytoscape({ container: ref.current, elements: [], style: [{selector:'node', style:{'background-color':'var(--node-company)','label':'data(name)','font-size':11}}, {selector:'edge', style:{'line-color':'var(--accent-flow)','width':2}}], layout: { name: 'fcose', nodeRepulsion: 8000, idealEdgeLength: 120, gravity: 0.25, animate: true, animationDuration: 600 } as any }); return ()=>cy.destroy(); },[]); return <div ref={ref} style={{height:'100%',width:'100%'}}/>; }
