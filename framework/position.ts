export type Area = [topLeft: Position, bottomRight: Position]

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

export function add(a: Position, b: Position): Position {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
  }
}

export function negate(a: Position): Position {
  return {
    x: -a.y,
    y: -a.y,
  }
}

export function getCenter(area: Area): Position {
  return {
    x: (area[0].x + area[1].x) / 2,
    y: (area[0].y + area[1].y) / 2,
  }
}
