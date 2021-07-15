import { registerHandlers } from "../framework/events"
import { createEmptySurface } from "./surfaces"
import { BpArea, BpSet, IncludeMode } from "./BpArea"
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
      let lastLastArea: BpArea | undefined
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          const pos = { x: i, y: j }
          const area = set.createNewArea(`test area ${i},${j}`, pos)

          if (lastArea) {
            area.addRelation({
              areaId: lastArea.id,
              viewing: false,
              relativePosition: { x: 0, y: 0 },
              includeMode: IncludeMode.All,
            })
          }

          if (lastLastArea) {
            area.addRelation({
              areaId: lastLastArea.id,
              viewing: true,
              relativePosition: { x: 0, y: 0 },
              includeMode: IncludeMode.Keep,
            })
          }

          lastLastArea = lastArea
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

DevButton("Open bp", (player) => {
  const area = getArea(player)
  if (!area) return
  player.opened = area.bpInventory[1]
})

DevButton("Open include bps", (player) => {
  const area = getArea(player)
  if (!area) return
  player.opened = area.bpInventory[2]
})
