export function configureIncluded(entity: LuaEntity): void {
  entity.minable = false
  entity.rotatable = false
  entity.operable = true
  entity.active = true
}

export function configureView(entity: LuaEntity): void {
  entity.minable = false
  entity.rotatable = false
  entity.operable = false
  entity.active = false
}

// export function setupEditable(entity: LuaEntity): void {
//   entity.minable = true
//   entity.rotatable = true
//   entity.operable = true
//   entity.active = true
// }
