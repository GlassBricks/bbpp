import { isFunction } from "./util"
import { vlog } from "./logging"

/**
 * Represents a reference to a function.
 */
export interface FuncRef<F extends Function> {
  "#registeredName": string
  "#funcType"?: F // make typescript a little happier
}

const nameToFunc: PRecord<string, Function> = {}
const funcToName: LuaTable<Function, string | undefined> = new LuaTable()

/**
 * Registers a function so that it can be retrieved by the given name later. This is useful when you need to refer to a
 * function inside `Tags` or `global`.
 *
 * The given name must be unique, and all registrations must the same across saves and reloads --
 * register on top-level, or make recoverable through `global` and `on_load`, and take care when doing migrations.
 *
 * @return RegisteredFunc a registered func. You could use this instead of the raw func.
 */
export function registerFunc<F extends Function>(func: F, name: string): FuncRef<F> {
  if (nameToFunc[name]) {
    error(`A func with name "${name}" already exists`)
  }
  nameToFunc[name] = func
  funcToName.set(func, name)
  vlog("registered function", name)
  return {
    "#registeredName": name,
  }
}

/**
 * Registers all functions of a given type.
 *
 * The names of the objects will be the prefix + the key name in the table.
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
export function getRef<F extends Function>(func: F): FuncRef<F> {
  const name = funcToName.get(func)
  if (!name) error("Attempt to get a reference to a function that was not registered, func:" + func)
  return {
    "#registeredName": name,
  }
}

/** Shorthand for getRef */
export const ref = getRef

/** Gets a function reference from a function, or nil if function is not registered. */
export function getRefOrNil<F extends Function>(func: F): FuncRef<F> | undefined {
  const name = funcToName.get(func)
  if (!name) return undefined
  return {
    "#registeredName": name,
  }
}

/** Gets a registered func from its name, or raises error if not registered. */
export function getFunc<F extends Function>(name: FuncRef<F>): F {
  const func = nameToFunc[name["#registeredName"]]
  if (!func) {
    error(
      `A function reference by the name of ${name} does not exist.
      Please report this to the mod author; the probably forgot to register or migrate something properly.`
    )
  }
  return func as F
}

/** Gets a registered func from its name, or raises error if not registered. */
export function getFuncOrNil<F extends Function>(name: FuncRef<F>): F | undefined {
  return nameToFunc[name["#registeredName"]] as F | undefined
}
