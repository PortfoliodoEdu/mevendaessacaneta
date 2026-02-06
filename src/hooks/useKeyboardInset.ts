import { useEffect, useState } from 'react';

/**
 * Retorna o "inset" aproximado do teclado (em px) usando VisualViewport quando disponível.
 * Em desktop / browsers sem suporte, tende a ficar em 0.
 */
export function useKeyboardInset() {
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // Em mobile, quando o teclado abre, o visualViewport encolhe.
      // O espaço "roubado" (teclado) pode ser aproximado assim:
      const inset = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      setKeyboardInset(Math.round(inset));
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('resize', update);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return keyboardInset;
}

