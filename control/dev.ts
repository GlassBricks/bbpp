import { DevButton } from "../framework/devButtons"
import { wlog } from "../framework/logging"
import { registerHandlers } from "../framework/events"
import { createLayer } from "./layers"

DevButton("test warning", () => {
  wlog("WARNING: you have been warned.")
})

// TODO: make better, obviously

function generateTestLayers() {
  for (let i = 0; i < 5; i++) {
    const name = "Test layer " + i
    createLayer(name, "data")
  }

  for (let i = 0; i < 5; i++) {
    const name = "Test view " + i
    const layer = createLayer(name, "view")
    layer.include[i] = "force"
  }
}

registerHandlers({
  on_init() {
    generateTestLayers()
  },
})
