import { registerHandlers } from "../framework/events"

declare const global: {
  isEmptySurface: PRecord<number, true>
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
  surface.generate_with_lab_tiles = true
  global.isEmptySurface[surface.index] = true
  return surface
}

registerHandlers({
  on_init() {
    global.isEmptySurface = {}
  },
  on_surface_deleted(e) {
    global.isEmptySurface[e.surface_index] = undefined
  },
  on_chunk_generated(e) {
    if (!global.isEmptySurface[e.surface.index]) return
    e.surface.build_checkerboard(e.area)
  },
})
