import { isFunction } from "./util"

const nameToFunc: Record<string, AnyFunction> = {}
const funcToName: LuaTable<AnyFunction, string> = new LuaTable()

export function registerFunc(uniqueName: string, func: AnyFunction): void {
  if (nameToFunc[uniqueName]) {
    error(`A func with name "${uniqueName}" already exists`)
  }
  nameToFunc[uniqueName] = func
  funcToName.set(func, uniqueName)
}

export function registerFuncs(funcs: Record<string, unknown>, prefix: string = ""): void {
  for (const [name, value] of pairs(funcs)) {
    if (isFunction(value)) {
      registerFunc(prefix + name, value)
    }
  }
}

export function getFuncOrNil(name: string): AnyFunction | undefined {
  return nameToFunc[name]
}

export function getFuncName(func: AnyFunction): string | undefined {
  return funcToName.get(func)
}
