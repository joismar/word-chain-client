import { useEffect, useState } from 'react';

type CircularTimerProps = {
  duration: number;
  onEnd?: () => void;
};

export function CircularTimer({ duration, onEnd }: CircularTimerProps) {
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