/** @noSelfInFile */
export type Area = readonly [topLeft: Position, bottomRight: Position]

export function add(a: Position, b: Position): Position {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
  }
}

export function subtract(a: Position, b: Position): Position {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
  }
}

export function multiply(a: Position, b: number): Position {
  return {
    x: a.x * b,
    y: a.y * b,
  }
}

export function divide(a: Position, b: number): Position {
  return {
    x: a.x / b,
    y: a.y / b,
  }
}

export function negate(a: Position): Position {
  return {
    x: -a.y,
    y: -a.y,
  }
}

export function round(a: Position): Position {
  return {
    x: Math.round(a.x),
    y: Math.round(a.y),
  }
}

export function floor(a: Position): Position {
  return {
    x: Math.floor(a.x),
    y: Math.floor(a.y),
  }
}

export function getCenter(area: Area): Position {
  return {
    x: (area[0].x + area[1].x) / 2,
    y: (area[0].y + area[1].y) / 2,
  }
}

export function shift(area: Area, by: Position): Area {
  return [add(area[0], by), add(area[1], by)]
}

export function shiftNegative(area: Area, by: Position): Area {
  return [subtract(area[0], by), subtract(area[1], by)]
}

export function contract(area: Area, by: number): Area {
  return [
    {
      x: area[0].x + by,
      y: area[0].y + by,
    },
    {
      x: area[1].x - by,
      y: area[1].y - by,
    },
  ]
}

export function isIn(pos: Position, area: Area): boolean {
  const tl = area[0]
  const br = area[1]
  return pos.x >= tl.x && pos.y >= tl.y && pos.x <= br.x && pos.y <= br.y
}

export function isFullyIn(smaller: Area, larger: Area): boolean {
  return isIn(smaller[0], larger) && isIn(smaller[1], larger)
}

export function intersects(a: Area, b: Area): boolean {
  // does not count if boundaries touching
  return !(a[1].x <= b[0].x || b[1].x <= a[0].x || a[1].y <= b[0].y || b[1].y <= a[0].y)
}
