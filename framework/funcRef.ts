import { isFunction } from "./util"

export interface FuncRef<Args extends any[]> {
  readonly "#name": string
  readonly func: (...args: Args) => void
}

const allFuncRefs: Record<string, FuncRef<any>> = {}

function funcRef<Args extends any[]>(uniqueName: string, func: (...args: Args) => void): FuncRef<Args> {
  if (allFuncRefs[uniqueName]) {
    throw `A func with name "${uniqueName}" already exists`
  }
  const ref: FuncRef<Args> = {
    "#name": uniqueName,
    func: func,
  }
  allFuncRefs[uniqueName] = ref
  return ref
}

export function namedFuncRefs<
  T extends {
    [P in string]: (...args: any[]) => void
  }
>(
  prefix: string,
  funcs: T
): {
  [P in keyof T]: T[P] extends (...args: infer Args) => any ? FuncRef<Args> : never
} {
  const result: PRecord<keyof T, FuncRef<any>> = {}
  for (const [key, func] of pairs(funcs)) {
    const name = prefix + key
    if (isFunction(func)) result[key] = funcRef(name, func as any)
  }
  return result as any
}

export function funcRefs<T extends Record<string, (...args: any[]) => void>>(
  funcs: T
): {
  [P in keyof T]: T[P] extends (...args: infer Args) => any ? FuncRef<Args> : never
} {
  return namedFuncRefs("", funcs)
}

export function getFuncRef<Args extends any[] = any>(name: string): FuncRef<Args> | undefined {
  return allFuncRefs[name]
}
