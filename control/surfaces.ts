import { BpSurface } from "./BpArea"

/**
 * Also immediately creates BpSurface
 */
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
  BpSurface._on_surface_created(surface)
  return surface
}
