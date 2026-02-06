import { Mic, Square, Waves } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioRecorderProps {
  isRecording: boolean;
  duration: number;
  transcript?: string;
  audioLevel?: number; // 0..1
  hint?: string;
  hintTone?: 'muted' | 'success' | 'destructive';
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export function AudioRecorder({
  isRecording,
  duration,
  transcript,
  audioLevel = 0,
  hint,
  hintTone = 'muted',
  onStartRecording,
  onStopRecording,
}: AudioRecorderProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className={cn(isRecording && "neon-ring")}>
          <button
            type="button"
            onClick={isRecording ? onStopRecording : onStartRecording}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center transition-all touch-manipulation tap-highlight-none",
              isRecording
                ? "bg-recording text-recording-foreground shadow-lg shadow-recording/30"
                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
            )}
          >
            {isRecording ? (
              <Square className="h-6 w-6 fill-current" />
            ) : (
              <Mic className="h-7 w-7" />
            )}
          </button>
        </div>

        <div className="flex-1">
          {isRecording ? (
            <div className="flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-recording animate-pulse" />
                <span className="text-lg font-medium text-foreground tabular-nums">
                  {formatDuration(duration)}
                </span>
              </div>

              {/* "Osciloscópio" simples por CSS (sem IA) */}
              <div
                className="flex items-end gap-1 h-8"
                style={{ ['--level' as any]: String(audioLevel) }}
                aria-label="Nível do microfone"
              >
                {Array.from({ length: 9 }).map((_, i) => (
                  <span
                    key={i}
                    className="w-1.5 rounded-full bg-recording/80 origin-bottom audio-bar"
                    style={{ animationDelay: `${i * 60}ms` }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p
              className={cn(
                "text-sm flex items-center gap-2",
                hintTone === 'success' && "text-success font-medium",
                hintTone === 'destructive' && "text-destructive font-medium",
                hintTone === 'muted' && "text-muted-foreground"
              )}
            >
              <Waves className="h-4 w-4" />
              {hint ?? "Toque para gravar áudio"}
            </p>
          )}
        </div>
      </div>

      {/* Transcrição ao vivo */}
      {(isRecording || (transcript && transcript.trim().length > 0)) && (
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Transcrição ao vivo
            </span>
            {isRecording && (
              <span className="text-xs text-muted-foreground">falando…</span>
            )}
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {transcript?.trim() || "—"}
          </p>
        </div>
      )}
    </div>
  );
}
