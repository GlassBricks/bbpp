/** @noSelfInFile */
import { isFunction } from "./util"
import { vlog } from "./logging"
import { getInstance, getInstanceRef, InstanceRef, WithIsValid } from "./instanceRef"

/**
 * Represents a reference to a function.
 */
export type SimpleFuncRef<F extends Function> = string & {
  "#funcType": F
}

export interface BoundFuncRef<F extends Function> {
  thisRef: InstanceRef<WithIsValid>
  funcName: string | number
  "#funcType": F
}

export type FuncRef<F extends Function> = SimpleFuncRef<F> | BoundFuncRef<F>

const nameToFunc: PRecord<string, Function> = {}
const funcToName: LuaTable<Function, string | undefined> = new LuaTable()

/**
 * Registers a function so that it can be retrieved by the given name later. This is useful when you need to refer to a
 * function inside `Tags` or `global`.
 *
 * The given name must be unique, and all registrations must be consistent across saves and reloads --
 * register on top-level, or make recoverable through `global` and `on_load`, and take care when doing migrations.
 */
export function registerFunc<F extends Function>(func: F, name: string): SimpleFuncRef<F> {
  if (nameToFunc[name]) {
    error(`A func with name "${name}" already exists`)
  }
  nameToFunc[name] = func
  funcToName.set(func, name)
  vlog("registered function", name)
  return name as SimpleFuncRef<F>
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
export function getFuncRef<F extends Function>(func: F): SimpleFuncRef<F> {
  const name =
    funcToName.get(func) ?? error("Attempt to get a reference to a function that was not registered, func:" + func)
  return name as SimpleFuncRef<F>
}

/** Gets a function reference from a function, or nil if function is not registered. */
export function getFuncRefOrNil<F extends Function>(func: F): FuncRef<F> | undefined {
  return funcToName.get(func) as SimpleFuncRef<F> | undefined
}

export function createBoundFunc<T extends object, K extends keyof T, F extends Function & T[K]>(
  thisRef: T,
  funcName: K
): BoundFuncRef<F> {
  return {
    thisRef: getInstanceRef(thisRef),
    funcName,
  } as Partial<BoundFuncRef<F>> as BoundFuncRef<F>
}

export function callFuncRef<F extends (...a: any) => any>(funcRef: FuncRef<F>, ...args: Parameters<F>): ReturnType<F> {
  if ((funcRef as BoundFuncRef<F>).thisRef !== undefined) {
    const boundFuncRef = funcRef as BoundFuncRef<F>
    const thisRef = getInstance(boundFuncRef.thisRef) as any
    const func = thisRef[boundFuncRef.funcName] as (this: unknown, ...a: any[]) => ReturnType<F>
    if (!func) {
      error(
        `There is no function named ${boundFuncRef.funcName} on the instance ` +
          (thisRef.constructor ? `of class ${thisRef.constructor.name}` : thisRef) +
          ". Did you register/migrate functions properly? Please report this to the mod author."
      )
    }
    return func.call(thisRef, ...(args as any[]))
  }
  const name = funcRef as SimpleFuncRef<F>
  const func = nameToFunc[name]
  if (!func) {
    error(
      `A function reference with the name of "${name}" does not exist. ` +
        "Did you register or migrate the functions properly?"
    )
  }
  return func(...(args as any[]))
}

export type Funcs<T> = {
  readonly [K in keyof T]: T[K] extends Function ? FuncRef<T[K]> : never
}

export const funcsMeta = {
  __index(this: { __self: any }, name: string): BoundFuncRef<any> {
    return createBoundFunc(this.__self, name)
  },
} as LuaMetatable<{ __self: any }>

export const staticFuncsMeta = {
  __index(this: { __self: any }, name: string): SimpleFuncRef<any> {
    return getFuncRef(this.__self[name])
  },
} as LuaMetatable<{ __self: any }>

export function makeStaticFuncs<T>(table: T): Funcs<T> {
  return setmetatable({ __self: table }, staticFuncsMeta) as any
}

export function makeBindingFuncs<T>(instance: T): Funcs<T> {
  return setmetatable({ __self: instance }, funcsMeta) as any
}
