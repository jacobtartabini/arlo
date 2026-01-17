"use client";

import { useRef, useEffect, useCallback } from "react";

interface Point {
  x: number;
  y: number;
}

interface EraserTrailProps {
  isActive: boolean;
  containerRef: React.RefObject<HTMLElement>;
  strokeWidth: number;
  backgroundColor?: string;
}

/**
 * Overlay canvas that renders a visible eraser trail while erasing.
 * Shows a white/background-colored stroke that follows the eraser path.
 */
export function useEraserTrail({
  isActive,
  containerRef,
  strokeWidth,
  backgroundColor = "#ffffff",
}: EraserTrailProps) {
  const trailCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const trailContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const pointsRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);

  // Create/update the trail canvas overlay
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create canvas if it doesn't exist
    if (!trailCanvasRef.current) {
      const canvas = document.createElement("canvas");
      canvas.style.cssText = `
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 100;
      `;
      canvas.className = "eraser-trail-canvas";
      trailCanvasRef.current = canvas;
    }

    const canvas = trailCanvasRef.current;

    // Add to container if active
    if (isActive && !container.contains(canvas)) {
      container.appendChild(canvas);
    } else if (!isActive && container.contains(canvas)) {
      container.removeChild(canvas);
      pointsRef.current = [];
    }

    // Size the canvas
    if (isActive) {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      trailContextRef.current = canvas.getContext("2d");
    }

    return () => {
      if (container.contains(canvas)) {
        container.removeChild(canvas);
      }
    };
  }, [isActive, containerRef]);

  // Draw smooth stroke between points using quadratic curves
  const drawTrail = useCallback(() => {
    const ctx = trailContextRef.current;
    const points = pointsRef.current;
    
    if (!ctx || points.length < 2) return;

    ctx.strokeStyle = backgroundColor;
    ctx.lineWidth = strokeWidth * 3; // Make eraser trail visible
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = 0.9;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    // Use quadratic curves for smooth lines
    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }

    // Line to the last point
    const lastPoint = points[points.length - 1];
    ctx.lineTo(lastPoint.x, lastPoint.y);
    ctx.stroke();
  }, [backgroundColor, strokeWidth]);

  // Start a new eraser stroke
  const startTrail = useCallback((point: Point) => {
    isDrawingRef.current = true;
    pointsRef.current = [point];
    
    // Clear canvas for new stroke
    const ctx = trailContextRef.current;
    const canvas = trailCanvasRef.current;
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // Continue the eraser stroke
  const continueTrail = useCallback((point: Point) => {
    if (!isDrawingRef.current) return;
    
    pointsRef.current.push(point);
    
    // Limit points to prevent performance issues
    if (pointsRef.current.length > 100) {
      pointsRef.current = pointsRef.current.slice(-50);
    }
    
    drawTrail();
  }, [drawTrail]);

  // End the eraser stroke and fade out
  const endTrail = useCallback(() => {
    isDrawingRef.current = false;
    
    // Fade out the trail after a short delay
    const canvas = trailCanvasRef.current;
    const ctx = trailContextRef.current;
    
    if (!canvas || !ctx) return;

    let opacity = 1;
    const fadeOut = () => {
      opacity -= 0.15;
      if (opacity <= 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pointsRef.current = [];
        return;
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = opacity;
      drawTrail();
      requestAnimationFrame(fadeOut);
    };
    
    // Start fade after brief pause so user sees the complete trail
    setTimeout(() => {
      requestAnimationFrame(fadeOut);
    }, 100);
  }, [drawTrail]);

  // Clear the trail immediately
  const clearTrail = useCallback(() => {
    const canvas = trailCanvasRef.current;
    const ctx = trailContextRef.current;
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    pointsRef.current = [];
    isDrawingRef.current = false;
  }, []);

  return {
    startTrail,
    continueTrail,
    endTrail,
    clearTrail,
    trailCanvasRef,
  };
}
