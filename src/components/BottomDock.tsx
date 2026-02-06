import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';

interface BottomDockProps {
  /** Espaço reservado para o BottomNav (ex: 64px). */
  baseBottomPx?: number;
  className?: string;
  children: ReactNode;
}

/**
 * Área fixa no rodapé (acima do BottomNav). Ao focar um input dentro dela,
 * "sobe" acompanhando o teclado (via visualViewport).
 */
export function BottomDock({ baseBottomPx = 64, className, children }: BottomDockProps) {
  const keyboardInset = useKeyboardInset();
  const [isActive, setIsActive] = useState(false);

  // Se o teclado fechou, a dock volta ao estado normal.
  useEffect(() => {
    if (keyboardInset === 0) setIsActive(false);
  }, [keyboardInset]);

  const bottomPx = useMemo(() => {
    if (!isActive) return baseBottomPx;
    return baseBottomPx + keyboardInset;
  }, [baseBottomPx, isActive, keyboardInset]);

  return (
    <div
      onFocusCapture={() => setIsActive(true)}
      onBlurCapture={() => {
        // Deixa o browser trocar foco antes de decidir.
        window.setTimeout(() => {
          const active = document.activeElement as HTMLElement | null;
          const stillInside = active ? active.closest('[data-bottom-dock="1"]') : null;
          if (!stillInside) setIsActive(false);
        }, 0);
      }}
      data-bottom-dock="1"
      className={cn(
        'fixed left-0 right-0 z-50',
        'border-t border-border bg-background/95 backdrop-blur-sm',
        'transition-[bottom] duration-200 ease-out',
        className
      )}
      style={{ bottom: bottomPx }}
    >
      <div className="max-w-lg mx-auto px-4 py-3">
        {children}
      </div>
    </div>
  );
}

