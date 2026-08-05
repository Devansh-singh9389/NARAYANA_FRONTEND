import { useState } from 'react';

/**
 * A custom hook that syncs state with the browser's localStorage.
 * Usage: const [value, setValue] = useLocalStorage('my-key', initialValue);
 */
export const useLocalStorage = (key, initialValue) => {
  // Pass an initializer function to useState so this only runs on the first render
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    
    try {
      const item = window.localStorage.getItem(key);
      // If it exists in localStorage, parse and return it. Otherwise, return initialValue.
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // A wrapped version of state setter function that persists the new value to localStorage
  const setValue = (value) => {
    try {
      // Allow value to be a function to match the standard useState API
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Update React state
      setStoredValue(valueToStore);
      
      // Update LocalStorage
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
};