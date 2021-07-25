import { registerHandlers } from "../framework/events"
import { Prototypes } from "../constants"
import { dlog } from "../framework/logging"

declare const global: {
  pasteActionBpInventory: LuaInventory
}

registerHandlers({
  on_init() {
    global.pasteActionBpInventory = game.create_inventory(1)
  },
})

export interface PasteActionTags {
  action: string
}

export const PasteActions: {
  [P in string]?: (player: LuaPlayer, event: OnPreBuildPayload, tags: any) => void
} = {}

export function setupPasteActionBp(player: LuaPlayer): LuaItemStack | undefined {
  if (!player.clear_cursor()) return undefined
  const stack = global.pasteActionBpInventory[0]
  stack.set_stack({ name: Prototypes.temporaryBlueprint })
  return stack
}

function tryDoPasteAction(player: LuaPlayer, event: OnPreBuildPayload) {
  const tags = player.cursor_stack.get_blueprint_entity_tags(1) as PasteActionTags
  if (!tags || !tags.action) return
  const action = PasteActions[tags.action]
  if (!action) return
  dlog("Performing paste action:", tags.action)
  action(player, event, tags)
}

let inDestroyMode = false
// runs a lot, so direct script.on_event instead
// todo: optimize in events.ts instead
script.on_event(defines.events.on_pre_build, (e) => {
  const player = game.get_player(e.player_index)
  if (player.cursor_stack.valid_for_read && player.cursor_stack.name === Prototypes.temporaryBlueprint) {
    if (!inDestroyMode) {
      inDestroyMode = true
      setDestroyMode()
    }
    tryDoPasteAction(player, e)
  } else {
    if (inDestroyMode) {
      inDestroyMode = false
      unsetDestroyMode()
    }
  }
})

function destroyEntities(this: void, e: OnBuiltEntityPayload) {
  e.created_entity.destroy()
}

function unsetDestroyMode(): void {
  script.on_event(defines.events.on_built_entity, undefined)
}

function setDestroyMode(): void {
  script.on_event(defines.events.on_built_entity, destroyEntities)
}
