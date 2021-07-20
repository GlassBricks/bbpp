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

export function getCenter(area: Area): Position {
  return {
    x: (area[0].x + area[1].x) / 2,
    y: (area[0].y + area[1].y) / 2,
  }
}

export function diagonalLength([a, b]: Area): number {
  const lx = b.x - a.x
  const ly = b.y - a.y
  return Math.sqrt(ly * ly + lx * lx)
}

export function isIn(pos: Position, area: Area): boolean {
  const tl = area[0]
  const br = area[1]
  return pos.x >= tl.x && pos.y >= tl.y && pos.x < br.x && pos.y < br.y
}

// element by element multiplication
export function elemMul(a: Position, b: Position): Position {
  return {
    x: a.x * b.x,
    y: a.y * b.y,
  }
}

export function multiplyArea(area: Area, b: number): Area {
  return [
    {
      x: area[0].x * b,
      y: area[0].y * b,
    },
    {
      x: area[1].x * b,
      y: area[1].y * b,
    },
  ]
}
