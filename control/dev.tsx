import { registerHandlers } from "../framework/events"
import { BpArea, BpSurface, IncludeMode } from "./BpArea"
import { DevButton } from "../framework/devButtons"
import { PlayerArea } from "./playerAreaTracking"
import { onPlayerInit } from "../framework/onPlayerInit"
import * as modGui from "mod-gui"
import Reactorio, { renderIn } from "../framework/gui"
import { getFuncRef, registerFunc } from "../framework/funcRef"
import { BpAreaEditor } from "./gui/BpAreaEditor"
import { createEmptySurface } from "./surfaces"
import { Area } from "../framework/position"
import { dlog } from "../framework/logging"

registerHandlers({
  on_init() {
    for (let n = 0; n < 0; n++) {
      const surface = createEmptySurface("test surface" + n)
      const bpSurface = BpSurface.get(surface)
      let lastArea: BpArea | undefined
      let lastLastArea: BpArea | undefined
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          const bounds: Area = [
            { x: i, y: j },
            { x: i, y: j },
          ]
          const area = bpSurface.createNewArea(`test area ${i},${j}`, bounds, 2)

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
    game.speed = 0.5
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
  player.opened = area.inventory[1]
})

DevButton("Open include bps", (player) => {
  const area = getArea(player)
  if (!area) return
  player.opened = area.inventory[2]
})
// todo move
// const devWindow = AreaNavigator.window
const devWindow = BpAreaEditor.window

function toggleDevWindow({ player_index }: { player_index: number }) {
  devWindow.toggle(game.get_player(player_index))
}

registerFunc(toggleDevWindow, "toggleDevWindow")

onPlayerInit((player) => {
  devWindow.toggle(player)
})

onPlayerInit((player) => {
  const button = (
    <button
      name={"bbpp:dev window"}
      style={modGui.button_style}
      caption="Dev"
      mouse_button_filter={["left"]}
      onClick={getFuncRef(toggleDevWindow)}
    />
  )
  renderIn(modGui.get_button_flow(player), "bbpp:DevWindow", button)
})
