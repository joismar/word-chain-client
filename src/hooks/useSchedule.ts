import React from "react";

type UseScheduleParams =
  | { timestamp: number; seconds?: never } // Exige `timestamp`, mas não permite `seconds`
  | { seconds: number; timestamp?: never };

export function useSchedule({ timestamp, seconds } : UseScheduleParams) {
    const [isEnabled, setEnabled] = React.useState(false);

    if (seconds) {
      timestamp = Date.now() / 1000 + seconds;
    }
  
    React.useEffect(() => {
      const diff = timestamp! - (Date.now() / 1000)

      const timer = setTimeout(() => {
        setEnabled(true);
      }, diff * 1000);
  
      return () => {
        clearTimeout(timer);
      };
    }, [timestamp]);
  
    return isEnabled;
};