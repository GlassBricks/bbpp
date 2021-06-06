import { dlog } from "../framework/logging"
import { DevButton } from "../framework/devButtons"

function createSurface() {
  if (game.surfaces["test-surface"]) return
  dlog("creating new surface")
  const surface = game.create_surface("test-surface")
  surface.generate_with_lab_tiles = true
}

DevButton("Create surface", createSurface)
