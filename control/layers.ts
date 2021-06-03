import { dlog } from "../framework/logging"
import { addDevButton } from "../framework/addDevButton"

function createSurface() {
  if (game.surfaces["test-surface"]) return
  dlog("creating new surface")
  const surface = game.create_surface("test-surface")
  surface.generate_with_lab_tiles = true
}

addDevButton("Create surface!!!", createSurface)
