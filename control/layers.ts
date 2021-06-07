import { customEvents, registerHandlers } from "../framework/events"
import { PREFIX } from "../constants"
import { wlog } from "../framework/logging"

export type LayerType = "data" | "view"
// TODO: plans
export type LayerId = number

export interface Layer {
  id: LayerId
  name: string
  surfaceName: string
  type: LayerType
  include: PRecord<LayerId, IncludeMode>
}

export type IncludeMode = "force"

declare global {
  interface Global {
    // TODO: move to plans
    layers: Record<string, Layer>
    // Used by LayerNavigator
    layerOrder: LayerId[]
    layerId: number
  }
}

// TODO: include plan
export function createLayer(name: string, type: LayerType): Layer {
  if (global.layers[name]) {
    wlog(`Layer with name ${name} already exists`)
  }
  const surfaceName = PREFIX + "layer-" + name
  const id = global.layerId++
  const newLayer: Layer = {
    id,
    name,
    surfaceName,
    type,
    include: {},
  }
  const surface = game.create_surface(surfaceName)
  surface.generate_with_lab_tiles = true
  surface.freeze_daytime = true
  global.layers[name] = newLayer
  global.layerOrder.push(id)
  return newLayer
}

export function refreshInclude(layer: LayerId): void {}

declare module "../framework/events" {
  interface CustomEvents {
    onLayersChanged: any
  }
}
customEvents.onLayersChanged = script.generate_event_name()

registerHandlers({
  on_init() {
    global.layerId = 0
    global.layers = {}
    global.layerOrder = []
  },
})
