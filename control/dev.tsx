import { BpArea, BpSurface } from "./BpArea"
import { DevButton } from "../framework/devButtons"
import { PlayerArea } from "./playerAreaTracking"
import { onPlayerInit } from "../framework/onPlayerInit"
import { dlog } from "../framework/logging"
import { getValueOrError } from "../framework/result"
import { registerHandlers } from "../framework/events"

registerHandlers({
  on_init() {
    const surface = game.get_surface(1)!
    const bpSurface = BpSurface.get(surface)
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        getValueOrError(bpSurface.tryCreateNewArea(`foo ${i} ${j}`, { x: 2 * i - 1, y: 2 * j - 1 }, { x: 2, y: 2 }, 1))
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
  player.opened = area.dataBp
})

DevButton("Open include all bp", (player) => {
  const area = getArea(player)
  if (!area) return
  player.opened = area.includeAllBps[0]
})
DevButton("Open include select bp", (player) => {
  const area = getArea(player)
  if (!area) return
  player.opened = area.includeSelectBps[0]
})
