import { isFunction } from "./util"
import { dlog } from "./logging"

const nameToFunc: Record<string, AnyFunction> = {}
const funcToName: LuaTable<AnyFunction, string> = new LuaTable()

/**
 * Registers a function so that it can be retrieved by name later. This is useful when you need to refer to a function
 * through save/reloads (e.g. in tags).
 *
 * In order to work properly through save/reloads, the same functions must be registered on every load
 * (top level, or recoverable through `global` on `on_load`) and/or be migrated if necessary.
 */
export function registerFunc(uniqueName: string, func: AnyFunction): void {
  if (nameToFunc[uniqueName]) {
    error(`A func with name "${uniqueName}" already exists`)
  }
  nameToFunc[uniqueName] = func
  funcToName.set(func, uniqueName)
  dlog("registered function", uniqueName)
}

/**
 * Registers all functions in a given object.
 *
 * The names of the objects will be the prefix + the key name in the object.
 *
 * @see registerFunc
 */
export function registerFuncs(funcs: Record<string, unknown>, prefix: string = ""): void {
  for (const [name, value] of pairs(funcs)) {
    if (isFunction(value)) {
      registerFunc(prefix + ":" + name, value)
    }
  }
}

/**
 * Gets a registered func by name, or nil if not registered.
 */
export function getFunc(name: string): AnyFunction | undefined {
  return nameToFunc[name]
}

/**
 * Gets the name of a registered func, or nil if not registered.
 */
export function getFuncName(func: AnyFunction): string | undefined {
  return funcToName.get(func)
}
