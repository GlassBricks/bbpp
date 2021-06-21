import { registerHandlers } from "../framework/events"
import { DataLayer, ViewLayer } from "./Layer"
import { onPlayerInit } from "../framework/playerData"
import { DevButton } from "../framework/devButtons"
import { dlog } from "../framework/logging"

function generateTestLayers() {
  for (let i = 0; i < 5; i++) {
    const name = "Test layer " + i
    DataLayer.create(name)
  }

  for (let i = 0; i < 5; i++) {
    const name = "Test view " + i
    const layer = ViewLayer.create(name)
    layer.getRelationTo(i).viewing = true
  }
}

registerHandlers({
  on_init() {
    generateTestLayers()
  },
})
onPlayerInit((player) => {
  player.teleport([0, 0], DataLayer.getDataLayerUserOrder()[0].surface)
})
DevButton("test something", (player) => {
  const something = player.gui.screen.add({ type: "frame" })
  const one = something.add({ type: "frame", name: "one" })
  const two = something.add({ type: "frame", index: 0, name: "two" })
  dlog("one:", one.get_index_in_parent())
  dlog("two:", two.get_index_in_parent())
})
