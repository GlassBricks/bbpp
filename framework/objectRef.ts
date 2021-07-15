import { registerHandlers } from "./events"

interface ObjectRefGlobal {
  instanceRefs: Record<number, unknown>
  instanceRefIds: LuaTable<AnyNotNil, number>
  nextInstanceId: number
}

declare const global: ObjectRefGlobal

registerHandlers({
  on_init() {
    global.instanceRefs = setmetatable({}, { __mode: "v" })
    global.instanceRefIds = setmetatable(new LuaTable(), { __mode: "k" })
    global.nextInstanceId = 1
  },
  on_load() {
    setmetatable(global.instanceRefs, { __mode: "v" })
    setmetatable(global.instanceRefIds, { __mode: "k" })
  },
})

export type ObjectRef<T> = number & {
  "#objectType": T
}

export function getObjectRef<T>(instance: T): ObjectRef<T> {
  const existingId = global.instanceRefIds.get(instance)
  if (existingId) return existingId as ObjectRef<T>
  const id = global.nextInstanceId++
  global.instanceRefIds.set(instance, id)
  global.instanceRefs[id] = instance
  return id as ObjectRef<T>
}

export function getObject<T>(ref: ObjectRef<T>): T {
  const instance = global.instanceRefs[ref]
  if (!instance) {
    error(`An instance with id ${ref} does not exist. Is it referenced elsewhere (not gc'ed)?`)
  }
  return instance as T
}
