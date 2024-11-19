import React, { useEffect, useState } from "react";

interface StatsProps {
  value: number;
  duration?: number; // Duration of animation in milliseconds
  easeOutExponent?: number; // Exponent of the easing function
}

const customEaseOut = (t: number, exponent: number): number =>
  1 - Math.pow(1 - t, exponent);

const AnimatedStats = ({
  value,
  duration = 2000,
  easeOutExponent = 6,
  ...props
}: StatsProps & {
  [key: string]: any;
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    const startValue = displayValue;
    const delta = value - startValue;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;

      const progress = Math.min((timestamp - start) / duration, 1); // Calculate progress
      const easedProgress = customEaseOut(progress, easeOutExponent); // Apply easing
      setDisplayValue(startValue + delta * easedProgress); // Update display value

      if (progress < 1) {
        requestAnimationFrame(animate); // Continue animation
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration, easeOutExponent]);

  return <div {...props}>{Math.round(displayValue)}</div>;
};

export default AnimatedStats;
