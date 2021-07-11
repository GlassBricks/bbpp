/** @noSelfInFile */

// eslint-disable-next-line @typescript-eslint/ban-types
export function isFunction(a: any): a is Function {
  return type(a) === "function"
}

export function isEmpty(a: AnyTable | undefined): boolean {
  if (!a) return true
  const [x] = next(a)
  return !x
}

/**
 * more efficient than Object.keys
 */
export function mapKeys<K extends keyof any, R>(obj: Record<K, any>, func: (key: K) => R): R[] {
  const result: R[] = []
  for (const [k] of pairs(obj)) {
    result[result.length] = func(k)
  }
  return result
}

export function mapValues<V, R>(obj: Record<any, V>, func: (value: V) => R): R[] {
  const result: R[] = []
  for (const [, v] of pairs(obj)) {
    result[result.length] = func(v)
  }
  return result
}

export function mapEntries<K extends keyof any, V, R>(obj: Record<K, V>, func: (key: K, value: V) => R): R[] {
  const result: R[] = []
  for (const [k, v] of pairs(obj)) {
    result[result.length] = func(k, v)
  }
  return result
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

export function shallowCopy<T>(t: T): T {
  if (type(t) !== "table") return t
  const result: Record<any, unknown> = {}
  for (const [k, v] of pairs(t)) {
    result[k] = v
  }
  return result as T
}

export function shallowArrayEquals<T>(a: T[], b: T[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (const [luaIndex, v] of ipairs(a)) {
    if (v !== b[luaIndex - 1]) return false
  }
  return true
}

export function shallowEquals<T extends AnyNotNil>(a: T, b: T): boolean {
  if (a === b) return true
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

export function conservativeShallowEquals<T extends AnyNotNil>(a: T, b: T): boolean {
  if (a === b) return true
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
  if (a === b) return true
  const typeA = type(a)
  if (typeA !== type(b)) return false
  if (typeA !== "table") return false // a!==b
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

export function arrayRemoveValue<T>(array: T[], value: T): boolean {
  for (const [luaIndex, element] of ipairs(array)) {
    if (element === value) {
      table.remove(array, luaIndex)
      return true
    }
  }
  return false
}

export function tableRemoveValue<T>(table: T, value: T[keyof T]): boolean {
  for (const [key, element] of pairs(table)) {
    if (element === value) {
      table[key] = undefined as any
      return true
    }
  }
  return false
}

export function isValid(a: { valid: boolean } | undefined): a is { valid: true } {
  return a !== undefined && a.valid
}

export function destroyIfValid(a: { valid: boolean; destroy: (this: void) => void } | undefined): void {
  if (isValid(a)) a.destroy()
}
