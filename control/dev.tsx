import { registerHandlers } from "../framework/events"
import { createEmptySurface } from "./surfaces"
import { BpArea, BpAreasGlobal, BpSet } from "./BpArea"
import { AreaNavigator } from "./gui/AreaNavigator"
import { DevButton } from "../framework/devButtons"
import { PlayerArea, teleportPlayerToArea } from "./playerAreaTracking"
import { onPlayerInit } from "../framework/onPlayerInit"

registerHandlers({
  on_init() {
    for (let n = 0; n < 3; n++) {
      const surface = createEmptySurface("bbpp:test-surface" + n)
      const set = BpSet.create("test" + n, surface, { x: 100, y: 100 })
      let lastArea: BpArea | undefined
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const pos = { x: i, y: j }
          const area = set.addNewArea(`test area ${i},${j}`, pos)

          if (lastArea) {
            area.relations.push({
              areaId: lastArea.id,
              tempViewing: true,
              editing: false,
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

declare const global: BpAreasGlobal
DevButton("Regenerate boundaries", () => {
  // todo: move to actual function
  for (const [, set] of pairs(global.bpSetById)) {
    const surface = set.surface
    for (const area of set.areas) {
      for (let n = 0; n < 2; n++) {
        {
          const y = area.area[n].y
          for (let x = area.area[0].x; x <= area.area[1].x; x++) {
            surface.set_tiles(
              [
                {
                  name: "blue-refined-concrete",
                  position: { x, y },
                },
              ],
              false
            )
          }
        }
        {
          const x = area.area[n].x
          for (let y = area.area[0].y; y <= area.area[1].y; y++) {
            surface.set_tiles(
              [
                {
                  name: "blue-refined-concrete",
                  position: { x, y },
                },
              ],
              false
            )
          }
        }
      }
    }
  }
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
  area.resetLayer()
})

DevButton("Delete view only", (player) => {
  const area = getArea(player)
  if (!area) return
  area.deleteViewOnlyEntities()
})
