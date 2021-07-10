import { registerHandlers } from "../framework/events"

export function createEmptySurface(name: string): LuaSurface {
  const surface = game.create_surface(name)
  surface.generate_with_lab_tiles = true
  surface.freeze_daytime = true
  return surface
}

declare const global: {
  dataSurfaces: PRecord<number, number>
  isDataSurface: PRecord<number, true>
}

registerHandlers({
  on_init() {
    global.dataSurfaces = {}
    global.isDataSurface = {}
  },
  on_surface_deleted(e) {
    const parallelUniverse = global.dataSurfaces[e.surface_index]
    if (parallelUniverse) {
      global.dataSurfaces[e.surface_index] = undefined
      game.delete_surface(game.get_surface(parallelUniverse)!)
    }
  },
})

export function isDataSurface(surface: LuaSurface): boolean {
  return global.isDataSurface[surface.index] === true
}

export function getParallelDataSurface(surface: LuaSurface): LuaSurface {
  if (global.isDataSurface[surface.index]) error("Tried to get data parallel of an already data surface")
  const index = surface.index
  const existing = global.dataSurfaces[index]
  if (existing !== undefined) return game.get_surface(existing)!
  const newSurface = createEmptySurface("bbpp:data " + index)
  global.dataSurfaces[index] = newSurface.index
  return newSurface
}
