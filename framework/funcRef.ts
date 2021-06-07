import { isFunction } from "./util"

/** @noSelf */
export interface FuncRef<Args extends any[]> {
  "#name": string
  /** this: undefined is a workaround for the "self" issue */
  func: (this: unknown, ...args: Args) => void
}

const allFuncRefs: Record<string, FuncRef<any>> = {}

export function funcRef<Args extends any[]>(
  uniqueName: string,
  func: (this: void, ...args: Args) => void
): FuncRef<Args> {
  if (allFuncRefs[uniqueName]) {
    throw `a GUI func with name "${uniqueName}" already exists`
  }
  const ref: FuncRef<Args> = {
    "#name": uniqueName,
    func: func,
  }
  allFuncRefs[uniqueName] = ref
  return ref
}

export function funcRefs<T extends Record<string, (this: any, ...args: any[]) => void>>(
  funcs: T
): {
  [P in keyof T]: T[P] extends (...args: infer Args) => any ? FuncRef<Args> : never
} {
  const result: PRecord<keyof T, FuncRef<any>> = {}
  for (const [name, func] of pairs(funcs)) {
    if (isFunction(func)) result[name] = funcRef(name as string, func as any)
  }
  return result as any
}

export function getFuncRef<Args extends any[] = any>(name: string): FuncRef<Args> | undefined {
  return allFuncRefs[name]
}
