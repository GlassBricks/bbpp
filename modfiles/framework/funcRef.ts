/** @noSelfInFile */
import { isFunction } from "./util"

export type FuncRef<F extends Function> = string & {
  "#funcType": F
}

const nameToFunc: PRecord<string, Function> = {}
const funcToName: LuaTable<Function, string | undefined> = new LuaTable()

/**
 * Registers a function so that it can be retrieved by the given name later. This is useful when you need to refer to a
 * function inside `Tags` or `global`.
 *
 * The given name must be unique, and all registrations must be consistent across saves and reloads --
 * register on top-level, or make recoverable through `global` and `on_load`, and take care when doing migrations.
 */
export function registerFunc<F extends Function>(func: F, name: string): FuncRef<F> {
  if (nameToFunc[name]) {
    error(`A func with name "${name}" already exists`)
  }
  nameToFunc[name] = func
  funcToName.set(func, name)
  // vlog("registered function", name)
  return name as FuncRef<F>
}

/**
 * Registers all functions of a given type.
 *
 * The names of the objects will be the prefix + the name name in the table.
 */
export function registerFuncs<T extends object>(table: T, prefix: string = ""): T {
  const prefixDot = prefix + "."
  for (const [name, value] of pairs(table)) {
    if (isFunction(value)) {
      registerFunc(value, prefixDot + name)
    }
  }
  return table
}

/** Gets a function reference from a function, or raises error if function is not registered. */
export function getFuncRef<F extends Function>(func: F): FuncRef<F> {
  const name =
    funcToName.get(func) ?? error("Attempt to get a reference to a function that was not registered, func:" + func)
  return name as FuncRef<F>
}

/** Shorthand for getFuncRef */
export const r = getFuncRef

/** Gets a function reference from a function, or nil if function is not registered. */
export function getFuncRefOrNil<F extends Function>(func: F): FuncRef<F> | undefined {
  return funcToName.get(func) as FuncRef<F> | undefined
}

export function derefFuncOrNil<F extends Function>(ref: FuncRef<F>): F | undefined {
  return nameToFunc[ref] as F | undefined
}
