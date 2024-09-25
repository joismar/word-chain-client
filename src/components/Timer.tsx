import { useEffect, useState } from 'react';

type TimerProps = {
  duration: number;
  onEnd?: () => void;
  onlyTime?: boolean;
};

export function Timer({ duration, onEnd, onlyTime }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (duration > 0) setTimeLeft(duration);

    const interval = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime === 0) onEnd?.();
        const newTime = prevTime - 1;
        const newProgress = (newTime / duration) * 100;
        setProgress(newProgress);
        return newTime >= 0 ? newTime : 0;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [duration]);

  function formatTime(time: number) {
    const maxTime = 99 * 60 + 59; // 99 minutos e 59 segundos

    time = Math.min(time, maxTime);

    const minutes = Math.floor(time / 60);
    const seconds = time % 60;

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}s`;
  }

  if (onlyTime)
    return (
      <div className="text-center text-amber-700 font-bold">{formatTime(timeLeft)}</div>
    )

  return (
    <div className="w-full max-w-md flex gap-2 items-center justify-center">
      <div className="relative w-full h-2 bg-neutral-700 rounded-full overflow-hidden">
        <div
          className="absolute top-0 right-0 h-full bg-amber-600 rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div className="text-center text-amber-700 font-bold">{timeLeft}s</div>
    </div>
  );
};