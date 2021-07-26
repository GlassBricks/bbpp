export function fullyRevive(ghost: LuaEntity): LuaEntity | undefined {
  const [, entity, proxy] = ghost.silent_revive({
    return_item_request_proxy: true,
  })
  if (!entity) {
    return undefined
  }
  if (proxy) {
    const moduleInventory = entity.get_module_inventory() || entity
    for (const [n, count] of pairs(proxy.item_requests)) {
      const name = n as string
      const items = { name, count }
      if (moduleInventory && moduleInventory.insert(items) === 0) entity.insert(items)
    }
    proxy.destroy()
  }
  return entity
}
