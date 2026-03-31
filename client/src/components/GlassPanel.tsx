import { AnimatePresence, motion } from 'framer-motion';
import type { PropsWithChildren } from 'react';
export function GlassPanel({ open, children }: PropsWithChildren<{ open: boolean }>) { return <AnimatePresence>{open && <motion.aside initial={{x:380}} animate={{x:0}} exit={{x:380}} style={{height:'100%',width:'min(380px,100vw)',background:'var(--glass-bg)',backdropFilter:'var(--glass-blur)',borderLeft:'1px solid var(--glass-border)'}}>{children}</motion.aside>}</AnimatePresence>; }
