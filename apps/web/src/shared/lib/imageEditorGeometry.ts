export interface Point {
  x: number;
  y: number;
}

export function flipPointX(point: Point, width: number): Point {
  return { x: width - point.x, y: point.y };
}

export function rotatePoint90(point: Point, width: number, height: number): Point {
  return { x: height - point.y, y: point.x };
}
