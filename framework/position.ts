export function sizeToArea({ x, y }: Position): BoundingBox {
  return [
    { x: -x / 2 - 1, y: -y / 2 - 1 },
    { x: x / 2 + 1, y: y / 2 + 1 },
  ]
}

export function subtract(a: Position, b: Position): Position {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
  }
}
