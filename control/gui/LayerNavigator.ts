import * as gui from "../../framework/gui"
import { create, GuiTemplate, update } from "../../framework/gui"
import { CloseButton } from "../../framework/guicomponents/buttons"
import { OpenedGuis } from "./openedGuis"
import { onPlayerInit } from "../../framework/playerData"
import * as modGui from "mod-gui"
import { funcRefs } from "../../framework/funcRef"
import { registerHandlers } from "../../framework/events"
import { destroyIfValid } from "../../framework/util"

export const { openLayerNavigator, closeLayerNavigator, updateLayerNavigator, layerNavigatorTeleportPlayer } = funcRefs(
  {
    openLayerNavigator({ player_index: playerIndex }: { player_index: number }) {
      if (!OpenedGuis(playerIndex).layerNavigator) {
        create(game.get_player(playerIndex).gui.screen, LayerNavigator)
      }
    },
    closeLayerNavigator({ player_index: playerIndex }: { player_index: number }) {
      const openedGui = OpenedGuis(playerIndex)
      if (openedGui.layerNavigator) {
        openedGui.layerNavigator.destroy()
        openedGui.layerNavigator = undefined
      }
    },
    updateLayerNavigator({ player_index: playerIndex }: { player_index: number }) {
      const openedGui = OpenedGuis(playerIndex)
      if (openedGui.layerNavigator) {
        update(openedGui.layerNavigator, LayerNavigator)
      }
    },
    layerNavigatorTeleportPlayer(element: ListBoxGuiElement) {
      const index = element.selected_index
      const layerName = global.layerOrder[index - 1]
      const surfaceName = global.layers[layerName].surfaceName
      const player = game.get_player(element.player_index)
      player.teleport(player.position, surfaceName)
    },
  }
)
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
      onClick: closeLayerNavigator,
    },
  ],
}
const LayersList: gui.GuiTemplate = {
  type: "list-box",
  // style: "inside_shallow_frame"
  styleMod: {
    width: 400,
  },
  onUpdate(element: ListBoxGuiElement) {
    element.clear_items()

    const currentSurface = game.get_player(element.player_index).surface.name
    let selectedIndex = 0
    for (const [i, layerName] of ipairs(global.layerOrder)) {
      element.add_item(layerName)
      if (currentSurface === global.layers[layerName].surfaceName) {
        selectedIndex = i
      }
    }
    element.selected_index = selectedIndex
  },
  onSelectionStateChanged: layerNavigatorTeleportPlayer,
}
export const LayerNavigator: gui.GuiTemplate = {
  type: "frame",
  name: "bbpp:layer-navigator",
  direction: "vertical",
  elementMod: {
    auto_center: true,
  },
  onCreated(element) {
    OpenedGuis(element.player_index).layerNavigator = element
  },
  onUpdate(element) {
    if (global.layerOrder.length === 0) {
      gui.create(element, {
        type: "label",
        name: "noLayersLabel",
        caption: "No layers",
      })
    } else {
      destroyIfValid(element.noLayersLabel)
    }
  },
  children: [TitleBar, LayersList],
}
onPlayerInit((player) => {
  const Button: GuiTemplate = {
    type: "button",
    style: modGui.button_style,
    caption: "LN", // TODO: make fancy image
    mouse_button_filter: ["left"],
    onClick: openLayerNavigator,
  }
  gui.create(modGui.get_button_flow(player), Button)
})

registerHandlers({
  // TODO: on layers updated event, as this is kinda bad
  on_player_changed_surface: updateLayerNavigator.func,
  on_surface_created: updateLayerNavigator.func,
  on_surface_deleted: updateLayerNavigator.func,
  on_surface_renamed: updateLayerNavigator.func,
  on_surface_imported: updateLayerNavigator.func,
})
