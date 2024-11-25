import { useEffect, useState } from "react";

function useDebounce(
  value: string,
  delay: number,
  callback: (value: string) => void = (_) => _
) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set a timeout to update the debounced value after the delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
      if (callback) {
        callback(value); // Call the callback when the debounced value changes
      }
    }, delay);

    // Clean up the timeout if the value or delay changes before the timeout completes
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay, callback]);

  return debouncedValue;
}

export default useDebounce;
