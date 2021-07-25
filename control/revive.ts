import { userWarning } from "../framework/logging"

export function fullyRevive(ghost: LuaEntity): LuaEntity | undefined {
  const [, entity, proxy] = ghost.silent_revive({
    return_item_request_proxy: true,
  })
  if (!entity) {
    userWarning("could not revive ghost (something in the way?)")
    return undefined
  }
  if (proxy) {
    for (const [name, count] of pairs(proxy.item_requests)) {
      entity.insert({ name: name as string, count: count })
    }
    proxy.destroy()
  }
  return entity
}
