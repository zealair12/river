import { motion } from 'framer-motion';
import type { PropsWithChildren } from 'react';
export function GlassCard({ children, className = '', onClick, glow }: PropsWithChildren<{ className?: string; onClick?: () => void; glow?: 'teal'|'red'|'purple'; }>) {
  const glowColor = glow === 'red' ? 'rgba(255,77,106,.35)' : glow === 'purple' ? 'rgba(167,139,250,.35)' : 'rgba(0,229,200,.35)';
  return <motion.div whileHover={{ scale: 1.01 }} onClick={onClick} className={className} style={{ background:'var(--glass-bg)',backdropFilter:'var(--glass-blur)',border:'1px solid var(--glass-border)',borderRadius:16,boxShadow:`var(--glass-shadow),0 0 24px ${glow?glowColor:'transparent'}`,padding:12 }}><div style={{borderTop:'1px solid rgba(255,255,255,.15)',paddingTop:8}}>{children}</div></motion.div>;
}
