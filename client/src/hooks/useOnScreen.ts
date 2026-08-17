import { useEffect, useRef, useState } from "react";

export default function useOnScreen<T extends Element>(options?: IntersectionObserverInit) {
  const ref = useRef<T>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      options
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [options]);

  return { ref, isIntersecting };
}
