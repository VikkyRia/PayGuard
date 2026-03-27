import { useEffect, useState, useRef } from "react";
import { Clock } from "lucide-react";

interface InspectionTimerProps {
  deadline: string; // ISO string
  onExpired?: () => void;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function InspectionTimer({ deadline, onExpired }: InspectionTimerProps) {
  // avoid impure calls during render by starting at 0
  const [remaining, setRemaining] = useState<number>(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const deadlineTime = new Date(deadline).getTime();

    const update = () => {
      const now = Date.now();
      const next = Math.max(0, deadlineTime - now);
      setRemaining(next);
      if (next <= 0) {
        onExpired?.();
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    // run immediately to avoid waiting 1s for the first tick
    update();

    // tick every second
    intervalRef.current = globalThis.setInterval(update, 1000);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [deadline, onExpired]);

  const seconds = Math.floor((remaining / 1000) % 60);
  const minutes = Math.floor((remaining / 1000 / 60) % 60);
  const hours = Math.floor((remaining / 1000 / 60 / 60));

  return (
    <div className="inspection-timer">
      <Clock />
      <span>
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    </div>
  );
}