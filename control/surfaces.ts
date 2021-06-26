import { registerHandlers } from "../framework/events"

export function createEmptySurface(name: string): LuaSurface {
  const surface = game.create_surface(name)
  surface.generate_with_lab_tiles = true
  surface.freeze_daytime = true
  return surface
}

declare const global: {
  parallelDataSurface: PRecord<number, number>
}

export function getParallelDataSurface(surface: LuaSurface): LuaSurface {
  const index = surface.index
  const existing = global.parallelDataSurface[index]
  if (existing !== undefined) return game.get_surface(existing)!
  const newSurface = createEmptySurface("bbpp:data parallel " + index)
  global.parallelDataSurface[index] = newSurface.index
  return newSurface
}

registerHandlers({
  on_init() {
    global.parallelDataSurface = {}
  },
  on_surface_deleted(e) {
    const parallelUniverse = global.parallelDataSurface[e.surface_index]
    if (parallelUniverse) {
      global.parallelDataSurface[e.surface_index] = undefined
      game.delete_surface(game.get_surface(parallelUniverse)!)
    }
  },
})
