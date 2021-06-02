import { dlog } from "../framework/logging"

function createSurface() {
  dlog("creating new surface")
  game.create_surface("test-surface", {
    terrain_segmentation: 1,
    water: 0,
    autoplace_controls: {},
    autoplace_settings: {},
    cliff_settings: {
      name: "cliff",
      cliff_elevation_0: 10,
      cliff_elevation_interval: 40,
      richness: 0,
    },
    seed: 0,
    width: 10000, // TODO: decide size
    height: 10000,
    starting_area: 1,
    starting_points: [{ x: 0, y: 0 }],
    peaceful_mode: true,
    property_expression_names: {},
  })
}
