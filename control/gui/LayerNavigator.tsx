/* eslint-disable prefer-const */
import { create, destroy, FC, renderIn, rerenderSelf } from "../../framework/gui"
import { CloseButton } from "../../framework/guicomponents/buttons"
import { OpenedGuis } from "./openedGuis"
import { onPlayerInit } from "../../framework/playerData"
import * as modGui from "mod-gui"
import { DataLayer, Layer, ViewLayer } from "../Layer"
import { PREFIX } from "../../constants"
import { registerFuncs } from "../../framework/funcRef"
import { registerHandlers } from "../../framework/events"
import createElement from "../../framework/jsx"

let LayersList: FC<{ type: "data" | "view" }>
let LayerNavigator: FC
let TitleBar: FC

LayerNavigator = () => (
  <frame created_direction={"vertical"} auto_center={true}>
    <TitleBar />
    <LayersList type="data" />
    <LayersList type="view" />
  </frame>
)

TitleBar = () => (
  <flow
    created_direction={"horizontal"}
    styleMod={{ horizontal_spacing: 8, height: 28 }}
    onCreated={(e) => {
      e.drag_target = e.parent
    }}
  >
    <label caption={"Layer Navigator"} created_style={"frame_title"} ignored_by_interaction={true} />
    <empty-widget created_style={"flib_titlebar_drag_handle"} ignored_by_interaction={true} />
    <CloseButton onClick={LayerNavFuncs.toggle} />
  </flow>
)

LayersList = ({ type }) => {
  const layers: Layer[] = type === "data" ? DataLayer.getDataLayerUserOrder() : ViewLayer.getOrder()
  return layers.length === 0 ? (
    <label caption="No Layers" />
  ) : (
    <list-box
      styleMod={{ width: 300 }}
      onSelectionStateChanged={LayerNavFuncs.teleport}
      tags={{ type }}
      onUpdate={(element) => {
        const currentSurface = game.get_player(element.player_index).surface.index
        element.clear_items()
        let selectedIndex = 0
        for (const [i, layer] of ipairs(layers)) {
          element.add_item(layer.name)
          if (currentSurface === layer.surface.index) {
            selectedIndex = i
          }
        }
        element.selected_index = selectedIndex
      }}
    />
  )
}

const LayerNavFuncs = {
  toggle({ player_index: playerIndex }: { player_index: number }) {
    const openedGui = OpenedGuis(playerIndex)
    if (openedGui.layerNavigator) {
      destroy(openedGui.layerNavigator)
      openedGui.layerNavigator = undefined
    } else {
      openedGui.layerNavigator = renderIn(
        game.get_player(playerIndex).gui.screen,
        PREFIX + "LayerNavigator",
        <LayerNavigator />
      )
    }
  },
  teleport(element: ListBoxGuiElement) {
    const layerOrder = element.tags.type === "data" ? DataLayer.getDataLayerUserOrder() : ViewLayer.getOrder()
    const layer = layerOrder[element.selected_index - 1]
    const player = game.get_player(element.player_index)
    player.teleport(player.position, layer.surface)
  },
}
registerFuncs(LayerNavFuncs, "LayerNavigator")

onPlayerInit((player) => {
  const button = (
    <button
      name={PREFIX + "LayerNavigatorButton"}
      style={modGui.button_style}
      caption="LN"
      mouse_button_filter={["left"]}
      onClick={LayerNavFuncs.toggle}
    />
  )
  create(modGui.get_button_flow(player), button)
})
registerHandlers({
  on_player_changed_surface(event) {
    const layerNavigator = OpenedGuis(event.player_index).layerNavigator
    if (layerNavigator) {
      rerenderSelf(layerNavigator, <LayerNavigator />)
    }
  },
  // TODO on layers_changed event
  on_surface_deleted() {
    for (const [player_index] of pairs(game.players)) {
      const layerNavigator = OpenedGuis(player_index as number).layerNavigator
      if (layerNavigator) rerenderSelf(layerNavigator, <LayerNavigator />)
    }
  },
})
// TODO: make hotbar key thing too
