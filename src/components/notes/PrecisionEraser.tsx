import { FabricObject, Path, Point, Canvas } from 'fabric';

interface EraserPoint {
  x: number;
  y: number;
}

interface PathPoint {
  x: number;
  y: number;
}

/**
 * Precision eraser that removes only the portions of strokes that overlap
 * with the eraser path, splitting strokes into remaining segments.
 */
export class PrecisionEraser {
  private canvas: Canvas;
  private eraserRadius: number;
  private erasedObjects: FabricObject[] = [];
  private newObjects: FabricObject[] = [];
  private objectsToRemove: Set<FabricObject> = new Set();

  constructor(canvas: Canvas, eraserRadius: number) {
    this.canvas = canvas;
    this.eraserRadius = eraserRadius;
  }

  /**
   * Check if a point is within the eraser circle
   */
  private isPointInEraser(point: PathPoint, eraserCenter: EraserPoint): boolean {
    const dx = point.x - eraserCenter.x;
    const dy = point.y - eraserCenter.y;
    return (dx * dx + dy * dy) <= (this.eraserRadius * this.eraserRadius);
  }

  /**
   * Get distance from point to eraser center
   */
  private getDistanceToEraser(point: PathPoint, eraserCenter: EraserPoint): number {
    const dx = point.x - eraserCenter.x;
    const dy = point.y - eraserCenter.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Check if a line segment intersects with the eraser circle
   */
  private segmentIntersectsEraser(
    p1: PathPoint,
    p2: PathPoint,
    eraserCenter: EraserPoint
  ): boolean {
    // Check if either endpoint is inside
    if (this.isPointInEraser(p1, eraserCenter) || this.isPointInEraser(p2, eraserCenter)) {
      return true;
    }

    // Check if the segment passes through the circle
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const fx = p1.x - eraserCenter.x;
    const fy = p1.y - eraserCenter.y;

    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - this.eraserRadius * this.eraserRadius;

    let discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return false;

    discriminant = Math.sqrt(discriminant);
    const t1 = (-b - discriminant) / (2 * a);
    const t2 = (-b + discriminant) / (2 * a);

    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
  }

  /**
   * Extract points from a Fabric.js Path object
   */
  private getPathPoints(path: Path): PathPoint[] {
    const points: PathPoint[] = [];
    const pathData = path.path;
    
    if (!pathData || !Array.isArray(pathData)) return points;

    // Get the path's transform to convert to canvas coordinates
    const matrix = path.calcTransformMatrix();
    
    let currentX = 0;
    let currentY = 0;

    for (const command of pathData) {
      const cmd = command[0] as string;
      
      switch (cmd) {
        case 'M':
        case 'L':
          currentX = command[1] as number;
          currentY = command[2] as number;
          points.push(this.transformPoint({ x: currentX, y: currentY }, matrix));
          break;
        case 'Q':
          // Quadratic curve - sample points along it
          const qx1 = command[1] as number;
          const qy1 = command[2] as number;
          const qx2 = command[3] as number;
          const qy2 = command[4] as number;
          
          for (let t = 0.1; t <= 1; t += 0.1) {
            const x = (1 - t) * (1 - t) * currentX + 2 * (1 - t) * t * qx1 + t * t * qx2;
            const y = (1 - t) * (1 - t) * currentY + 2 * (1 - t) * t * qy1 + t * t * qy2;
            points.push(this.transformPoint({ x, y }, matrix));
          }
          currentX = qx2;
          currentY = qy2;
          break;
        case 'C':
          // Cubic curve - sample points along it
          const cx1 = command[1] as number;
          const cy1 = command[2] as number;
          const cx2 = command[3] as number;
          const cy2 = command[4] as number;
          const cx3 = command[5] as number;
          const cy3 = command[6] as number;
          
          for (let t = 0.1; t <= 1; t += 0.1) {
            const x = Math.pow(1-t, 3) * currentX + 3 * Math.pow(1-t, 2) * t * cx1 + 
                     3 * (1-t) * t * t * cx2 + Math.pow(t, 3) * cx3;
            const y = Math.pow(1-t, 3) * currentY + 3 * Math.pow(1-t, 2) * t * cy1 + 
                     3 * (1-t) * t * t * cy2 + Math.pow(t, 3) * cy3;
            points.push(this.transformPoint({ x, y }, matrix));
          }
          currentX = cx3;
          currentY = cy3;
          break;
      }
    }
    
    return points;
  }

  /**
   * Transform a point using a matrix
   */
  private transformPoint(point: PathPoint, matrix: number[]): PathPoint {
    return {
      x: point.x * matrix[0] + point.y * matrix[2] + matrix[4],
      y: point.x * matrix[1] + point.y * matrix[3] + matrix[5]
    };
  }

  /**
   * Create a new path from a subset of points
   */
  private createPathFromPoints(
    points: PathPoint[],
    originalPath: Path
  ): Path | null {
    if (points.length < 2) return null;

    // Create path data
    const pathData: (string | number)[][] = [];
    pathData.push(['M', points[0].x, points[0].y]);
    
    for (let i = 1; i < points.length; i++) {
      pathData.push(['L', points[i].x, points[i].y]);
    }

    try {
      const newPath = new Path(pathData as any, {
        stroke: originalPath.stroke,
        strokeWidth: originalPath.strokeWidth,
        fill: originalPath.fill,
        strokeLineCap: originalPath.strokeLineCap,
        strokeLineJoin: originalPath.strokeLineJoin,
        opacity: originalPath.opacity,
        selectable: false,
        evented: false,
      });
      
      return newPath;
    } catch (e) {
      console.error('Error creating path:', e);
      return null;
    }
  }

  /**
   * Erase at a single point, splitting paths as needed
   */
  eraseAtPoint(eraserCenter: EraserPoint): { removed: FabricObject[]; added: FabricObject[] } {
    const removed: FabricObject[] = [];
    const added: FabricObject[] = [];
    
    const objects = this.canvas.getObjects();
    
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      
      // Only process path objects (strokes)
      if (obj.type !== 'path') continue;
      
      const path = obj as Path;
      const points = this.getPathPoints(path);
      
      if (points.length === 0) continue;

      // Check if any points are within eraser radius
      let hasIntersection = false;
      for (const point of points) {
        if (this.isPointInEraser(point, eraserCenter)) {
          hasIntersection = true;
          break;
        }
      }

      // Also check segments
      if (!hasIntersection) {
        for (let j = 0; j < points.length - 1; j++) {
          if (this.segmentIntersectsEraser(points[j], points[j + 1], eraserCenter)) {
            hasIntersection = true;
            break;
          }
        }
      }

      if (!hasIntersection) continue;

      // Split the path at erased portions
      const segments: PathPoint[][] = [];
      let currentSegment: PathPoint[] = [];

      for (let j = 0; j < points.length; j++) {
        const point = points[j];
        const isErased = this.isPointInEraser(point, eraserCenter);

        if (!isErased) {
          currentSegment.push(point);
        } else {
          // End current segment if it has enough points
          if (currentSegment.length >= 2) {
            segments.push([...currentSegment]);
          }
          currentSegment = [];
        }
      }

      // Don't forget the last segment
      if (currentSegment.length >= 2) {
        segments.push(currentSegment);
      }

      // Mark original for removal
      if (!this.objectsToRemove.has(obj)) {
        this.objectsToRemove.add(obj);
        removed.push(obj);
      }

      // Create new paths for remaining segments
      for (const segment of segments) {
        // Skip very small segments (less than ~5 pixels total length)
        let totalLength = 0;
        for (let k = 0; k < segment.length - 1; k++) {
          const dx = segment[k + 1].x - segment[k].x;
          const dy = segment[k + 1].y - segment[k].y;
          totalLength += Math.sqrt(dx * dx + dy * dy);
        }
        
        if (totalLength < 5) continue;

        const newPath = this.createPathFromPoints(segment, path);
        if (newPath) {
          added.push(newPath);
        }
      }
    }

    return { removed, added };
  }

  /**
   * Erase along a path between two points
   */
  eraseAlongPath(
    start: EraserPoint,
    end: EraserPoint,
    samplingInterval: number = 4
  ): { removed: FabricObject[]; added: FabricObject[] } {
    const allRemoved: FabricObject[] = [];
    const allAdded: FabricObject[] = [];
    
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    const steps = Math.max(1, Math.ceil(distance / samplingInterval));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = {
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t
      };
      
      const result = this.eraseAtPoint(point);
      allRemoved.push(...result.removed);
      allAdded.push(...result.added);
    }

    return { removed: allRemoved, added: allAdded };
  }

  /**
   * Apply all pending changes to the canvas
   */
  applyChanges(): { removed: FabricObject[]; added: FabricObject[] } {
    const removed = Array.from(this.objectsToRemove);
    const added = this.newObjects;

    // Remove original objects
    for (const obj of removed) {
      this.canvas.remove(obj);
    }

    // Add new split objects
    for (const obj of added) {
      this.canvas.add(obj);
    }

    this.canvas.renderAll();

    // Clear state
    this.objectsToRemove.clear();
    this.newObjects = [];

    return { removed, added };
  }

  /**
   * Get all objects to remove without applying
   */
  getObjectsToRemove(): FabricObject[] {
    return Array.from(this.objectsToRemove);
  }

  /**
   * Get all new objects to add without applying
   */
  getNewObjects(): FabricObject[] {
    return this.newObjects;
  }

  /**
   * Accumulate changes from an erase operation
   */
  accumulateChanges(removed: FabricObject[], added: FabricObject[]): void {
    for (const obj of removed) {
      this.objectsToRemove.add(obj);
    }
    this.newObjects.push(...added);
  }
}

/**
 * Create a precision eraser session that batches all erase operations
 * into a single undo step
 */
export function createEraserSession(canvas: Canvas, eraserRadius: number) {
  const eraser = new PrecisionEraser(canvas, eraserRadius);
  let allRemoved: FabricObject[] = [];
  let allAdded: FabricObject[] = [];

  return {
    eraseAt(point: EraserPoint) {
      const { removed, added } = eraser.eraseAtPoint(point);
      allRemoved.push(...removed);
      allAdded.push(...added);
      eraser.accumulateChanges(removed, added);
    },

    eraseAlong(start: EraserPoint, end: EraserPoint) {
      const { removed, added } = eraser.eraseAlongPath(start, end);
      allRemoved.push(...removed);
      allAdded.push(...added);
      eraser.accumulateChanges(removed, added);
    },

    finalize(): { removed: FabricObject[]; added: FabricObject[] } {
      const result = eraser.applyChanges();
      const finalRemoved = allRemoved;
      const finalAdded = allAdded;
      allRemoved = [];
      allAdded = [];
      return { removed: finalRemoved, added: result.added };
    },

    cancel() {
      allRemoved = [];
      allAdded = [];
    }
  };
}
