import { registerHandlers } from "./events"

interface ObjectRefGlobal {
  instanceRefs: Record<number, WithIsValid>
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

export type InstanceRef<T extends WithIsValid> = number & {
  "#objectType": T
}

export function getInstanceRef<T extends WithIsValid>(instance: T): InstanceRef<T> {
  const existingId = global.instanceRefIds.get(instance)
  if (existingId) return existingId as InstanceRef<T>
  const id = global.nextInstanceId++
  global.instanceRefIds.set(instance, id)
  global.instanceRefs[id] = instance
  return id as InstanceRef<T>
}

export interface WithIsValid {
  isValid?(): boolean
}

export function getInstance<T>(ref: InstanceRef<T>): T {
  const instance = global.instanceRefs[ref]
  if (!instance || (instance.isValid && !instance.isValid())) {
    error(`An instance with id ${ref} does not exist or is invalid. It maybe could have been gc'ed?`)
  }
  return instance as T
}
