// src/components/TypingIndicator.jsx
import React, { useEffect, useState } from "react";

const TypingIndicator = () => {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-xs italic text-gray-500 flex items-center">
      <span>Typing{dots}</span>
    </div>
  );
};

export default TypingIndicator;
