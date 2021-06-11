// Some stuff needed to generate a blueprint from thin air.
// A special surface is created, which contains some chests, which contains blueprints
// (some inventory is needed to create items).

import { registerHandlers } from "../framework/events"
import { Prototypes, Surfaces } from "../constants"
import { DevButtons } from "../framework/devButtons"

function createBpHandlingSurface() {
  if (game.get_surface(Surfaces.bpHandlingSurface)) return
  const surface = game.create_surface(Surfaces.bpHandlingSurface)
  surface.generate_with_lab_tiles = true
  surface.freeze_daytime = true
}

function getBpHandlingSurface(): LuaSurface {
  return game.get_surface(Surfaces.bpHandlingSurface)!
}

// TODO create one plan/layer/etc
interface Global {
  bpHandlingChests: PRecord<number, PRecord<number, LuaEntity>>
}

declare const global: Global

registerHandlers({
  on_init() {
    createBpHandlingSurface()
    global.bpHandlingChests = {}
  },
})

function createBpHandlingChest(set: number, layer: number) {
  const position = { x: set, y: layer }
  const chest = getBpHandlingSurface().create_entity({
    name: Prototypes.bpHandlingChest,
    position,
    create_build_effect_smoke: false,
    force: "neutral",
  })
  if (chest === undefined) {
    throw "Couldn't create bp handling chest"
  }
  chest.destructible = false
  return chest
}

export function getBpHandlingInventory(set: number, layer: number): LuaInventory {
  const allChests = global.bpHandlingChests
  let forSet = allChests[set]
  if (!forSet) {
    forSet = allChests[set] = {}
  }
  let chest = forSet[layer]
  if (!chest) {
    chest = forSet[layer] = createBpHandlingChest(set, layer)
  }
  return chest.get_inventory(defines.inventory.chest)!
}

export function getBpForLayer(set: number, layer: number): LuaItemStack {
  const stack = getBpHandlingInventory(set, layer)[1]!
  if (!stack.valid_for_read || !stack.is_blueprint) {
    stack.set_stack({ name: "blueprint" })
  }
  return stack
}

DevButtons({
  "teleport to forbidden layer": (player) => {
    player.teleport([0, 0], getBpHandlingSurface())
  },
})
