'use client';

import React, { useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
  audioLevel: number;
  isActive: boolean;
  color?: string;
  barCount?: number;
}

export function WaveformVisualizer({
  audioLevel,
  isActive,
  color = '#6366f1',
  barCount = 32,
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const barsRef = useRef<number[]>(Array(barCount).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const barWidth = width / barCount;
      const maxBarHeight = height * 0.8;
      const centerY = height / 2;

      barsRef.current = barsRef.current.map((currentHeight, i) => {
        if (!isActive) {
          return currentHeight * 0.9;
        }

        const randomFactor = Math.random() * 0.4 + 0.8;
        const targetHeight = Math.max(
          4,
          audioLevel * maxBarHeight * randomFactor
        );
        
        return currentHeight + (targetHeight - currentHeight) * 0.3;
      });

      barsRef.current.forEach((height, i) => {
        const x = i * barWidth + barWidth / 2;
        const barHeight = Math.max(4, height * maxBarHeight);
        
        const gradient = ctx.createLinearGradient(x, centerY - barHeight / 2, x, centerY + barHeight / 2);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.5, color + '80');
        gradient.addColorStop(1, color);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(
          x - barWidth / 3,
          centerY - barHeight / 2,
          (barWidth * 2) / 3,
          barHeight,
          2
        );
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioLevel, isActive, color, barCount]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={60}
      className="w-full h-[60px]"
    />
  );
}
