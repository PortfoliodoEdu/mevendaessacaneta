import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';

interface BottomTrayProps {
  /** Espaço reservado para o BottomNav (ex: 64px). */
  baseBottomPx?: number;
  /** Altura visual do tray em mobile (ex: 60 = 60vh). */
  heightVh?: number;
  className?: string;
  children: ReactNode;
}

/**
 * Bandeja fixa nos ~60% inferiores (acima do BottomNav).
 * Ao focar um input dentro dela, sobe acompanhando o teclado.
 */
export function BottomTray({
  baseBottomPx = 64,
  heightVh = 60,
  className,
  children,
}: BottomTrayProps) {
  const keyboardInset = useKeyboardInset();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (keyboardInset === 0) setIsActive(false);
  }, [keyboardInset]);

  const bottomPx = useMemo(() => {
    if (!isActive) return baseBottomPx;
    return baseBottomPx + keyboardInset;
  }, [baseBottomPx, isActive, keyboardInset]);

  return (
    <section
      data-bottom-tray="1"
      onFocusCapture={() => setIsActive(true)}
      onBlurCapture={() => {
        window.setTimeout(() => {
          const active = document.activeElement as HTMLElement | null;
          const stillInside = active ? active.closest('[data-bottom-tray="1"]') : null;
          if (!stillInside) setIsActive(false);
        }, 0);
      }}
      className={cn('fixed left-0 right-0 z-40', className)}
      style={{ bottom: bottomPx }}
    >
      <div
        className={cn(
          'max-w-lg mx-auto',
          'bg-card/95 backdrop-blur-sm border border-border',
          'rounded-t-2xl shadow-lg',
          'overflow-hidden'
        )}
        style={{ height: `${heightVh}vh` }}
      >
        {/* handle */}
        <div className="flex justify-center py-2">
          <div className="h-1 w-10 rounded-full bg-muted" />
        </div>

        <div className="h-[calc(100%-12px)] overflow-y-auto overscroll-contain px-4 pb-4">
          {children}
        </div>
      </div>
    </section>
  );
}

