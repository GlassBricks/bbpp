// eslint-disable-next-line @typescript-eslint/ban-types
export function isFunction(a: any): a is Function {
  return type(a) === "function"
}

export function isEmpty(a: any): boolean {
  const [x] = next(a)
  return !x
}

export function deepAssign(target: Record<string | number, unknown>, source: PRecord<string | number, unknown>): void {
  for (const [key, value] of pairs(source)) {
    if (value && typeof value === "object") {
      target[key] = target[key] || {}
      deepAssign(target[key] as Record<string, unknown>, value)
    } else {
      target[key] = value
    }
  }
}

export function deepCopy<T>(t: T): T {
  if (type(t) !== "table") return t
  const result: Record<any, unknown> = {}
  for (const [k, v] of pairs(t)) {
    result[k] = v
  }
  return result as T
}

export function shallowArrayEquals<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false
  for (const [luaIndex, v] of ipairs(a)) {
    if (v !== b[luaIndex - 1]) return false
  }
  return true
}

export function shallowEquals<T extends object>(a: T, b: T): boolean {
  for (const [k, v1] of pairs(a)) {
    const v2 = b[k]
    if (v1 !== v2) return false
  }
  // b has at least everything in a
  for (const k in b) {
    if (!(k in a)) return false
  }
  return true
}

export function conservativeShallowEquals<T extends object>(a: T, b: T): boolean {
  for (const [k, v1] of pairs(a)) {
    if (type(v1) === "table") return false
    const v2 = b[k]
    if (v1 !== v2) return false
  }
  // b has at least everything in a
  for (const k in b) {
    if (!(k in a)) return false
  }
  return true
}

export function deepEquals(a: any, b: any): boolean {
  const typeA = type(a)
  if (typeA !== type(b)) return false
  if (typeA !== "table") return a === b
  for (const [k, v1] of pairs(a)) {
    const v2 = b[k]
    if (!deepEquals(v1, v2)) return false
  }
  // b has at least everything in a
  for (const k in b) {
    if (!(k in a)) return false
  }
  return true
}

export function arrayRemoveElement<T>(arr: T[], item: T): void {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === item) {
      table.remove(arr, i + 1)
      break
    }
  }
}

export function isValid(a: any): boolean {
  return typeof a === "object" && a.valid
}

export function destroyIfValid(a: any): void {
  if (isValid(a)) (a.destroy as (this: void) => void)()
}
