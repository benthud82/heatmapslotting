'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface SpotlightPulseProps {
  targetSelector: string; // data-tour attribute value, e.g., "cart-parking-tool"
  show?: boolean;
}

export default function SpotlightPulse({ targetSelector, show = true }: SpotlightPulseProps) {
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  const updatePosition = useCallback(() => {
    const target = document.querySelector(`[data-tour="${targetSelector}"]`);
    if (target) {
      const rect = target.getBoundingClientRect();
      setPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      });
    } else {
      setPosition(null);
    }
  }, [targetSelector]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!show || !mounted) return;

    // Initial position update
    updatePosition();

    // Update on scroll/resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    // Use ResizeObserver for dynamic content
    const resizeObserver = new ResizeObserver(updatePosition);
    const target = document.querySelector(`[data-tour="${targetSelector}"]`);
    if (target) {
      resizeObserver.observe(target);
    }

    // Use MutationObserver for DOM changes
    const mutationObserver = new MutationObserver(updatePosition);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [targetSelector, show, mounted, updatePosition]);

  if (!mounted || !show || !position) return null;

  // Calculate center and size of the pulse rings
  const centerX = position.left + position.width / 2;
  const centerY = position.top + position.height / 2;
  const size = Math.max(position.width, position.height) + 16; // Add padding

  const pulseContent = (
    <div
      className="pointer-events-none fixed z-[45]"
      style={{
        top: centerY - size / 2,
        left: centerX - size / 2,
        width: size,
        height: size,
      }}
    >
      {/* Multiple pulse rings for layered effect */}
      <div
        className="absolute inset-0 rounded-full border-2 border-amber-400/60"
        style={{
          animation: 'journey-pulse 2s ease-out infinite',
        }}
      />
      <div
        className="absolute inset-0 rounded-full border-2 border-amber-400/40"
        style={{
          animation: 'journey-pulse 2s ease-out 0.5s infinite',
        }}
      />
      <div
        className="absolute inset-0 rounded-full border-2 border-amber-400/20"
        style={{
          animation: 'journey-pulse 2s ease-out 1s infinite',
        }}
      />
      {/* Static glow ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow: '0 0 20px 4px rgba(245, 158, 11, 0.25)',
        }}
      />
    </div>
  );

  return createPortal(pulseContent, document.body);
}
