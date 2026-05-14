'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number; // estimated height per item in px
  containerHeight: number; // visible area height
  overscan?: number; // extra items to render outside viewport
  renderItem: (item: T, index: number) => React.ReactNode;
  getKey: (item: T, index: number) => string | number;
}

/**
 * Lightweight virtual list that renders only visible items.
 * Uses a fixed estimated height — good for transcript bubbles which are
 * roughly uniform in size. For highly variable heights use a proper
 * library like @tanstack/react-virtual (install when needed).
 */
export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
  renderItem,
  getKey,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
  const endIndex = Math.min(items.length - 1, startIndex + visibleCount);

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetTop = startIndex * itemHeight;

  // Auto-scroll to bottom when items change (new transcript entries)
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [items.length]);

  return (
    <div
      ref={containerRef}
      style={{ height: containerHeight, overflowY: 'auto' }}
      onScroll={handleScroll}
      className="relative"
    >
      {/* Spacer for total scroll height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ position: 'absolute', top: offsetTop, width: '100%' }}>
          {visibleItems.map((item, localIndex) => (
            <div key={getKey(item, startIndex + localIndex)} style={{ minHeight: itemHeight }}>
              {renderItem(item, startIndex + localIndex)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
