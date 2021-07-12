import { registerHandlers } from "../framework/events"
import { createEmptySurface } from "./surfaces"
import { BpArea, BpSet } from "./BpArea"
import { AreaNavigator } from "./gui/AreaNavigator"
import { DevButton } from "../framework/devButtons"
import { PlayerArea, teleportPlayerToArea } from "./playerAreaTracking"
import { onPlayerInit } from "../framework/onPlayerInit"

registerHandlers({
  on_init() {
    for (let n = 0; n < 3; n++) {
      const surface = createEmptySurface("bbpp:test-surface" + n)
      const set = new BpSet("test" + n, surface, { x: 100, y: 80 }, 2)
      let lastArea: BpArea | undefined
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          const pos = { x: i, y: j }
          const area = set.createNewArea(`test area ${i},${j}`, pos)

          if (lastArea) {
            area.relations.push({
              areaId: lastArea.id,
              tempViewing: true,
              relativePosition: undefined,
            })
          }

          lastArea = area
        }
      }
    }
  },
})
onPlayerInit((player) => {
  teleportPlayerToArea(player, BpArea.getById(1))
  AreaNavigator.toggle({ player_index: player.index })
})

function getArea(player: LuaPlayer): BpArea | undefined {
  const area = PlayerArea.get(player.index).area
  if (!area) {
    log("not in bp user area")
  }
  return area
}

DevButton("Commit changes", (player) => {
  const area = getArea(player)
  if (!area) return
  area.writeChanges()
})

DevButton("Reset area", (player) => {
  const area = getArea(player)
  if (!area) return
  area.resetArea()
})

DevButton("Delete view only", (player) => {
  const area = getArea(player)
  if (!area) return
  area.deleteViewOnlyEntities()
})

DevButton("Set opened?", (player) => {
  const area = getArea(player)
  if (!area) return
  player.opened = area.dataBp
})
