
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./FloatingWhatsApp.css";

function FloatingWhatsApp() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const footer = document.querySelector(".site-footer");

    if (!footer) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(!entry.isIntersecting);
      },
      {
        threshold: 0.01,
      }
    );

    observer.observe(footer);

    return () => observer.disconnect();
  }, []);

  if (!isVisible) return null;

  return createPortal(
    <a
      className="floating-whatsapp"
      href="https://wa.me/2349133502119?text=Hello%20Alexandra%27s%20Floral%2C%20I%27d%20like%20to%20make%20an%20enquiry."
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Alexandra's Floral on WhatsApp"
      title="Chat with us on WhatsApp"
    >
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path
          fill="currentColor"
          d="M16.04 3C8.86 3 3.02 8.82 3.02 15.98c0 2.29.6 4.52 1.75 6.5L3 29l6.7-1.75a13.05 13.05 0 0 0 6.34 1.62h.01c7.17 0 13.01-5.82 13.01-12.98A12.9 12.9 0 0 0 25.25 6.7 12.94 12.94 0 0 0 16.04 3Zm0 23.66h-.01c-1.95 0-3.87-.52-5.54-1.51l-.4-.24-3.98 1.04 1.06-3.87-.26-.4a10.77 10.77 0 0 1-1.65-5.7c0-5.96 4.86-10.8 10.83-10.8 2.89 0 5.61 1.12 7.65 3.16a10.7 10.7 0 0 1 3.17 7.63c0 5.96-4.86 10.8-10.83 10.8Zm5.94-8.09c-.32-.16-1.89-.93-2.18-1.03-.29-.1-.5-.16-.7.16-.21.32-.8 1.03-.98 1.24-.18.21-.36.24-.68.08-.32-.16-1.34-.49-2.55-1.57-.94-.84-1.58-1.88-1.76-2.2-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.55.16-.18.21-.32.32-.53.1-.21.05-.4-.03-.56-.08-.16-.7-1.69-.96-2.31-.25-.6-.51-.52-.7-.53h-.6c-.21 0-.55.08-.84.4-.29.32-1.1 1.08-1.1 2.62s1.13 3.04 1.29 3.25c.16.21 2.22 3.38 5.37 4.74.75.32 1.33.52 1.79.66.75.24 1.44.2 1.98.12.6-.09 1.89-.77 2.15-1.51.27-.74.27-1.37.19-1.51-.08-.13-.29-.21-.6-.37Z"
        />
      </svg>
    </a>,
    document.body
  );
}

export default FloatingWhatsApp;
