import { registerHandlers } from "../framework/events"
import { BpArea, BpSurface, InclusionMode } from "./BpArea"
import { DevButton } from "../framework/devButtons"
import { PlayerArea } from "./playerAreaTracking"
import { onPlayerInit } from "../framework/onPlayerInit"
import Reactorio from "../framework/gui"
import { dlog } from "../framework/logging"
import { getValueOrError } from "../framework/result"

registerHandlers({
  on_init() {
    for (let n = 0; n < 1; n++) {
      const surface = game.get_surface(1)!
      const bpSurface = BpSurface.get(surface)
      let lastArea: BpArea | undefined
      let lastLastArea: BpArea | undefined
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          const area = getValueOrError(
            bpSurface.tryCreateNewArea(`foo ${i} ${j}`, { x: 2 * i - 1, y: 2 * j - 1 }, { x: 2, y: 2 }, 1)
          )

          if (lastArea) {
            area.addInclusion(lastArea)
          }

          if (lastLastArea) {
            const inclusion = area.addInclusion(lastLastArea)
            inclusion.ghosts = true
            inclusion.includeMode = InclusionMode.Select
          }

          lastLastArea = lastArea
          lastArea = area
        }
      }
    }
  },
})

onPlayerInit((player) => {
  // teleportPlayerToArea(player, BpArea.getById(1))
  player.toggle_map_editor()
})

function getArea(player: LuaPlayer): BpArea | undefined {
  const area = PlayerArea.get(player)
  if (!area) {
    dlog("not in bp user area")
  }
  return area
}

DevButton("Open bp", (player) => {
  const area = getArea(player)
  if (!area) return
  player.opened = area.inventory[0]
})

DevButton("Open include bps", (player) => {
  const area = getArea(player)
  if (!area) return
  player.opened = area.inventory[1]
})
// todo move
// const devWindow = AreaNavigator.window
