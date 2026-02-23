import { useState } from 'react';

export const useClickRipple = () => {
  const [ripples, setRipples] = useState<React.CSSProperties[]>([]);

  const createRipple = (event: React.MouseEvent<HTMLElement>) => {
    const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
    const size = Math.max(width, height);
    const x = event.clientX - left - size / 2;
    const y = event.clientY - top - size / 2;

    const newRipple: React.CSSProperties = {
      top: y + 'px',
      left: x + 'px',
      width: size + 'px',
      height: size + 'px',
    };

    setRipples(prev => [...prev, newRipple]);

    setTimeout(() => {
        setRipples(prev => prev.slice(1));
    }, 700)
  };

  return {
    ripples,
    createRipple,
  };
};
