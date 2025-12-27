// Animation variants for Framer Motion
export const springTransition = {
  type: 'spring',
  stiffness: 350,
  damping: 30,
} as const;

export const softSpring = {
  type: 'spring',
  stiffness: 300,
  damping: 25,
} as const;

export const quickSpring = {
  type: 'spring',
  stiffness: 400,
  damping: 20,
} as const;

export const fadeInOut = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
} as const;

export const slideFromLeft = {
  initial: { x: '-100%', opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: '-100%', opacity: 0 },
} as const;

export const scaleIn = {
  initial: { scale: 0 },
  animate: { scale: 1 },
} as const;

// Sidebar specific
export const indicatorTransition = {
  type: 'spring',
  stiffness: 350,
  damping: 30,
} as const;

// Bottom Nav specific
export const circleTransition = {
  type: 'spring',
  stiffness: 350,
  damping: 30,
} as const;

export const iconTransition = {
  type: 'spring',
  stiffness: 400,
  damping: 25,
} as const;

export const pulseAnimation = {
  scale: [1, 1.1, 1],
  transition: { duration: 2, repeat: Infinity },
} as const;
