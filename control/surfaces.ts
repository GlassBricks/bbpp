import { registerHandlers } from "../framework/events"

declare const global: {
  isEmptySurface: PRecord<number, true>
  dataSurfaces: PRecord<number, number>
  isDataSurface: PRecord<number, true>
}

export function createEmptySurface(name: string): LuaSurface {
  const surface = game.create_surface(name, {
    default_enable_all_autoplace_controls: false,
    property_expression_names: {
      cliffiness: 0,
    },
    autoplace_settings: {
      tile: {
        settings: {
          "out-of-map": {
            frequency: "normal",
            size: "normal",
            richness: "normal",
          },
        },
      },
    },
    starting_area: "none",
  })
  surface.freeze_daytime = true
  global.isEmptySurface[surface.index] = true
  return surface
}

registerHandlers({
  on_init() {
    global.isEmptySurface = {}
    global.dataSurfaces = {}
    global.isDataSurface = {}
  },
  on_surface_deleted(e) {
    const parallelUniverse = global.dataSurfaces[e.surface_index]
    if (parallelUniverse) {
      global.dataSurfaces[e.surface_index] = undefined
      game.delete_surface(game.get_surface(parallelUniverse)!)
    }
    global.isEmptySurface[e.surface_index] = undefined
  },
  on_chunk_generated(e) {
    if (!global.isEmptySurface[e.surface.index]) return
    e.surface.build_checkerboard(e.area)
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
