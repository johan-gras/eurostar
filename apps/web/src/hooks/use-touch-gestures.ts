'use client';

import { useRef, useEffect, useCallback, useState } from 'react';

interface TouchGestureOptions {
  onPinchZoom?: (scale: number) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  minScale?: number;
  maxScale?: number;
  swipeThreshold?: number;
}

interface TouchState {
  startX: number;
  startY: number;
  startDistance: number;
  currentScale: number;
}

function getDistance(touches: TouchList): number {
  if (touches.length < 2) return 0;
  const touch1 = touches[0];
  const touch2 = touches[1];
  if (!touch1 || !touch2) return 0;
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function useTouchGestures<T extends HTMLElement>(
  options: TouchGestureOptions
) {
  const {
    onPinchZoom,
    onSwipeLeft,
    onSwipeRight,
    minScale = 0.5,
    maxScale = 2,
    swipeThreshold = 50,
  } = options;

  const ref = useRef<T>(null);
  const touchState = useRef<TouchState | null>(null);
  const [scale, setScale] = useState(1);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      touchState.current = {
        startX: 0,
        startY: 0,
        startDistance: getDistance(e.touches),
        currentScale: scale,
      };
    } else if (e.touches.length === 1 && e.touches[0]) {
      // Swipe start
      touchState.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        startDistance: 0,
        currentScale: scale,
      };
    }
  }, [scale]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchState.current) return;

    if (e.touches.length === 2 && touchState.current.startDistance > 0) {
      // Pinch zoom
      const currentDistance = getDistance(e.touches);
      const scaleChange = currentDistance / touchState.current.startDistance;
      const newScale = Math.min(
        maxScale,
        Math.max(minScale, touchState.current.currentScale * scaleChange)
      );

      setScale(newScale);
      onPinchZoom?.(newScale);

      // Prevent default to stop page zoom
      e.preventDefault();
    }
  }, [minScale, maxScale, onPinchZoom]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchState.current) return;

    // Check for swipe (only with single touch)
    if (e.changedTouches.length === 1 && touchState.current.startDistance === 0) {
      const touch = e.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - touchState.current.startX;
      const deltaY = touch.clientY - touchState.current.startY;

      // Only count as swipe if horizontal movement is greater than vertical
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold) {
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
    }

    touchState.current = null;
  }, [swipeThreshold, onSwipeLeft, onSwipeRight]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const resetScale = useCallback(() => {
    setScale(1);
    onPinchZoom?.(1);
  }, [onPinchZoom]);

  return { ref, scale, setScale, resetScale };
}
