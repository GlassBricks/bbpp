import * as gui from "../../framework/gui"
import { GuiTemplate } from "../../framework/gui"
import { CloseButton } from "../../framework/guicomponents/buttons"
import { OpenedGuis } from "./openedGuis"
import { onPlayerInit } from "../../framework/playerData"
import * as modGui from "mod-gui"
import { namedFuncRefs } from "../../framework/funcRef"
import { destroyIfValid } from "../../framework/util"
import { DataLayer, Layer, ViewLayer } from "../Layer"
import { PREFIX } from "../../constants"

const LayerNavFuncs = namedFuncRefs("LayerNavigator:", {
  toggle({ player_index: playerIndex }: { player_index: number }) {
    const openedGui = OpenedGuis(playerIndex)
    if (openedGui.layerNavigator) {
      openedGui.layerNavigator.destroy()
      openedGui.layerNavigator = undefined
    } else {
      openedGui.layerNavigator = gui.create(game.get_player(playerIndex).gui.screen, LayerNavigator)
    }
  },
  teleportClick(element: ListBoxGuiElement) {
    const layerOrder = element.parent.name === "data" ? DataLayer.getDataLayerUserOrder() : ViewLayer.getOrder()
    const layer = layerOrder[element.selected_index - 1]
    const player = game.get_player(element.player_index)
    player.teleport(player.position, layer.surface)
  },
})
const TitleBar: gui.GuiTemplate = {
  type: "flow",
  direction: "horizontal",
  elementMod: {
    drag_target: (_, element) => element.parent,
  },
  styleMod: {
    horizontal_spacing: 8,
    height: 28,
  },
  children: [
    {
      type: "label",
      caption: "Layer Navigator",
      style: "frame_title",
      ignored_by_interaction: true,
    },
    {
      type: "empty-widget",
      style: "flib_titlebar_drag_handle",
      ignored_by_interaction: true,
    },
    {
      ...CloseButton,
      onClick: LayerNavFuncs.toggle,
    },
  ],
}
const LayersList: GuiTemplate<string> = {
  type: "flow",
  direction: "vertical",
  elementMod: {
    name: (p) => p,
  },
  onUpdate(element, type) {
    const layers = type === "data" ? DataLayer.getDataLayerUserOrder() : ViewLayer.getOrder()
    if (layers.length === 0) {
      if (!element.noLayersLabel)
        gui.create(element, {
          type: "label",
          name: "noLayersLabel",
          caption: "No layers",
        })
    } else {
      destroyIfValid(element.noLayersLabel)
    }
  },
  children: [
    {
      type: "list-box",
      styleMod: {
        width: 300,
      },
      onUpdate(element: ListBoxGuiElement, type): void {
        const currentSurface = game.get_player(element.player_index).index
        element.clear_items()
        let selectedIndex = 0
        const layers: Layer[] = type === "data" ? DataLayer.getDataLayerUserOrder() : ViewLayer.getOrder()
        for (const [i, layer] of ipairs(layers)) {
          element.add_item(layer.name)
          if (currentSurface === layer.surface.index) {
            selectedIndex = i
          }
        }
        element.selected_index = selectedIndex
      },
      onSelectionStateChanged: LayerNavFuncs.teleportClick,
    },
  ],
}
const LayerNavigator: gui.GuiTemplate = {
  type: "frame",
  name: "bbpp:layer-navigator",
  direction: "vertical",
  elementMod: {
    auto_center: true,
  },
  onPostCreated(element) {
    gui.create(element, LayersList, "data")
    gui.create(element, LayersList, "view")
  },
  onUpdate(element) {
    gui.update(element, LayersList, "data")
    gui.update(element, LayersList, "view")
  }, // TODO: something better with this?
  children: [TitleBar],
}
onPlayerInit((player) => {
  const Button: gui.GuiTemplate = {
    type: "button",
    name: PREFIX + "LayerNavigator",
    style: modGui.button_style,
    caption: "LN", // TODO: make fancy image
    mouse_button_filter: ["left"],
    onClick: LayerNavFuncs.toggle,
  }
  gui.create(modGui.get_button_flow(player), Button)
})
// TODO: make hotbar key thing too
