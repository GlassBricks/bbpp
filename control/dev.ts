import { registerHandlers } from "../framework/events"
import { DataLayer, ViewLayer } from "./Layer"
import { onPlayerInit } from "../framework/playerData"

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
