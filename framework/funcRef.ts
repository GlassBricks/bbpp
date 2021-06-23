import { isFunction } from "./util"
import { dlog } from "./logging"

/**
 * Function name (string) with fancier type inference.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type FuncName<F extends Function> = string

/**
 * Represents a function that has been registered.
 *
 * The name is the given `funcName`, and the function can be retrieved from the name using {@link getFunc}
 */
export type RegisteredFunc<F extends Function> = F & { funcName: FuncName<F> }
const nameToFunc: PRecord<string, RegisteredFunc<Function>> = {}

/**
 * Registers a function so that it can be retrieved by the given name later. This is useful when you need to refer to a
 * function inside `Tags` or `global`.
 *
 * The given name must be unique, and all registrations must the same across saves and reloads --
 * register on top-level, or make recoverable through `global` and `on_load`, and take care when doing migrations.
 *
 * @return RegisteredFunc a registered func. You could use this instead of the raw func.
 */
export function registerFunc<F extends Function>(func: F, uniqueName: string): RegisteredFunc<F> {
  if (nameToFunc[uniqueName]) {
    error(`A func with name "${uniqueName}" already exists`)
  }
  const funcObject = setmetatable<RegisteredFunc<F>>(
    {
      funcName: uniqueName,
    } as RegisteredFunc<never>,
    {
      __call(...args: any[]) {
        ;(func as unknown as (this: void, ...a: any[]) => any)(...args)
      },
    }
  )
  nameToFunc[uniqueName] = funcObject
  dlog("registered function", uniqueName)
  return funcObject
}

type WithRegisteredFuncs<T> = {
  [P in keyof T]: T[P] extends Function ? RegisteredFunc<T[P]> : T[P]
}

/**
 * Registers all functions of a given type. The functions are modified in place
 * (all functions becomes RegisteredFunctions).
 *
 * The names of the objects will be the prefix + the key name in the table.
 *
 * @return table the original table (all functions now {@link RegisteredFunc}, this is for type checking)
 *
 * @see registerFunc
 */
export function registerFuncs<T extends object>(table: T, prefix: string = ""): WithRegisteredFuncs<T> {
  for (const [name, value] of pairs(table)) {
    if (isFunction(value)) {
      table[name] = registerFunc(value, prefix + ":" + name)
    }
  }
  return table as WithRegisteredFuncs<T>
}

/**
 * Gets a registered func from its name, or raises error if not registered.
 */
export function getFunc<F extends Function>(name: FuncName<F>): RegisteredFunc<F> {
  const func = nameToFunc[name]
  if (!func) {
    error(
      `A function reference by the name of ${name} does not exist.
      Please report this to the mod author; the probably forgot to register or migrate something properly.`
    )
  }
  return func as RegisteredFunc<F>
}

/**
 * Gets a registered func from its name, or raises error if not registered.
 */
export function getFuncOrNil<F extends Function>(name: FuncName<F>): RegisteredFunc<F> | undefined {
  return nameToFunc[name] as any
}

export function isRegisteredFunc<F extends Function>(func: F): func is RegisteredFunc<F> {
  return type(func) === "table" && (func as any).funcName !== undefined
}
