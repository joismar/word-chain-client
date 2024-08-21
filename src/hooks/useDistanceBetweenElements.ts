import { useState, useEffect } from 'react';

export function useDistanceBetweenElements(
  ref1: React.RefObject<HTMLDivElement>,
  ref2: React.RefObject<HTMLDivElement>
) {
  const [distance, setDistance] = useState<number>();

  useEffect(() => {
    function calculateDistance() {
      if (ref1.current && ref2.current) {
        const rect1 = ref1.current.getBoundingClientRect();
        const rect2 = ref2.current.getBoundingClientRect();

        const dx = rect2.left - rect1.left;
        const dy = rect2.top - rect1.top;

        const calculatedDistance = Math.sqrt(dx * dx + dy * dy);
        setDistance(calculatedDistance);
      }
    }

    calculateDistance();

    window.addEventListener('resize', calculateDistance);
    window.addEventListener('scroll', calculateDistance);

    return () => {
      window.removeEventListener('resize', calculateDistance);
      window.removeEventListener('scroll', calculateDistance);
    };
  }, [ref1, ref2]);

  return distance;
}
