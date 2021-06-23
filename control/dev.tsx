import { registerHandlers } from "../framework/events"
import { DataLayer, ViewLayer } from "./Layer"
import createElement, { renderIn } from "../framework/gui"
import { LayerNavigator } from "./gui/LayerNavigator"

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
  on_tick() {
    for (const [, player] of pairs(game.players)) {
      renderIn(game.get_player(player.index).gui.screen, "LayerNavigator", <LayerNavigator />)
    }
  },
})
