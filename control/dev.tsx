import { registerHandlers } from "../framework/events"
import { createEmptySurface } from "./surfaces"
import { BpAreasGlobal, BpSet, UserArea } from "./BpArea"
import { AreaNavigator } from "./gui/AreaNavigator"
import { onPlayerInit } from "../framework/playerData"
import { DevButton } from "../framework/devButtons"

registerHandlers({
  on_init() {
    for (let n = 0; n < 3; n++) {
      const surface = createEmptySurface("bbpp:test-surface" + n)
      const set = BpSet.create("test" + n, surface, { x: 100, y: 100 })
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const pos = { x: i, y: j }
          set.createNewArea(`test area ${i},${j}`, pos)
        }
      }
    }
  },
})
onPlayerInit((player) => {
  AreaNavigator.toggle({ player_index: player.index })
})
declare const global: BpAreasGlobal
DevButton("Regenerate boundaries", () => {
  // todo: move to actual function
  for (const [id, set] of pairs(global.bpSetById)) {
    const surface = set.surface
    for (const areaId of set.areaIds) {
      const area = UserArea.getById(areaId)
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
