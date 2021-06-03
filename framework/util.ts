export function isValid(a: any): boolean  {
  return typeof a === "object" && a.valid
}

export function destroyIfValid(a: any): void {
  if (isValid(a)) a.destroy()
}

/**
 * Does not support non-simple keys, circular references, metatables, etc.
 */
export function simpleCopy<T>(obj: T): T {
  if (typeof obj === "object") {
    const copy: Record<any, any> = {}
    for (const [key, value] of pairs(obj)) {
      copy[key] = simpleCopy(value)
    }
    return copy as T
  }
  return obj
}
