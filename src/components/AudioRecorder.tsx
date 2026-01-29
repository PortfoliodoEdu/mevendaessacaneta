import { Mic, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioRecorderProps {
  isRecording: boolean;
  duration: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export function AudioRecorder({
  isRecording,
  duration,
  onStartRecording,
  onStopRecording,
}: AudioRecorderProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={isRecording ? onStopRecording : onStartRecording}
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center transition-all touch-manipulation tap-highlight-none",
          isRecording
            ? "bg-recording text-recording-foreground animate-pulse-recording shadow-lg shadow-recording/30"
            : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
        )}
      >
        {isRecording ? (
          <Square className="h-6 w-6 fill-current" />
        ) : (
          <Mic className="h-7 w-7" />
        )}
      </button>

      {isRecording && (
        <div className="flex items-center gap-2 animate-fade-in">
          <span className="h-2 w-2 rounded-full bg-recording animate-pulse" />
          <span className="text-lg font-medium text-foreground tabular-nums">
            {formatDuration(duration)}
          </span>
        </div>
      )}

      {!isRecording && (
        <p className="text-sm text-muted-foreground">
          Toque para gravar áudio
        </p>
      )}
    </div>
  );
}
