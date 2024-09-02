import React from "react";

export function useSchedule(timestamp: number) {
    const [isEnabled, setEnabled] = React.useState(false);
  
    React.useEffect(() => {
      const diff = timestamp - (Date.now() / 1000)
      console.log(timestamp, diff, (Date.now() / 1000))
      const timer = setTimeout(() => {
        setEnabled(true);
      }, diff * 1000);
  
      return () => {
        clearTimeout(timer);
      };
    }, [timestamp]);
  
    return isEnabled;
};