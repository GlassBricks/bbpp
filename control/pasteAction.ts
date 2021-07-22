import { registerHandlers } from "../framework/events"
import { Prototypes } from "../constants"
import { dlog } from "../framework/logging"

declare const global: {
  pasteActionBpInventory: LuaInventory
}

export interface PasteActionTags {
  action: string
}

export const PasteActions: {
  [P in string]?: (player: LuaPlayer, position: Position, tags: any) => void
} = {}

export function setupPasteActionBp(player: LuaPlayer): LuaItemStack | undefined {
  if (!player.clear_cursor()) return undefined
  const stack = global.pasteActionBpInventory[0]
  stack.set_stack({ name: Prototypes.temporaryBlueprint })
  return stack
}

registerHandlers({
  on_init() {
    global.pasteActionBpInventory = game.create_inventory(1)
  },
  on_built_entity(e) {
    const createdEntity = e.created_entity
    const position = createdEntity.position
    const tags = (createdEntity.type === "entity-ghost" ? createdEntity.tags : e.tags) as PasteActionTags | undefined
    createdEntity.destroy()
    if (!tags || !tags.action) return
    const action = PasteActions[tags.action]
    if (!action) {
      dlog("No paste action with name", action)
      return
    }

    const player = game.get_player(e.player_index)
    action(player, position, tags)
  },
})

script.set_event_filter(defines.events.on_built_entity, [
  {
    filter: "name",
    name: Prototypes.pasteAction,
  },
  {
    filter: "ghost_name",
    name: Prototypes.pasteAction,
  },
  {
    filter: "name",
    name: Prototypes.tileEntityWhite,
  },
  {
    filter: "ghost_name",
    name: Prototypes.tileEntityWhite,
  },
])
