/** @noSelfInFile */

import { registerHandlers } from "./events"

interface EntityDataGlobal {
  entityData: Record<string, any>
}

declare const global: EntityDataGlobal

export function getEntityData<T>(entity: LuaEntity): T | undefined {
  const unitNumber = entity.unit_number
  return unitNumber && global.entityData[unitNumber]
}

export function getEntityDataByUnitNumber<T>(unitNumber: number): T | undefined {
  return global.entityData[unitNumber]
}

export function setEntityData<T>(entity: LuaEntity, value: T): boolean {
  const unitNumber = entity.unit_number
  if (!unitNumber) return false
  global.entityData[unitNumber] = value
  if (value !== undefined) {
    script.register_on_entity_destroyed(entity)
  }
  return true
}

registerHandlers({
  on_init() {
    global.entityData = {}
  },
  on_entity_destroyed(e) {
    const unitNumber = e.unit_number
    if (unitNumber !== undefined) global.entityData[unitNumber] = undefined
  },
})
