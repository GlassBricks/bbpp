// eslint-disable-next-line @typescript-eslint/ban-types
export function isFunction(a: any): a is AnyFunction {
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
