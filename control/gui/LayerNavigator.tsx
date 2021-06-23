/* eslint-disable prefer-const */
import createElement, { AnySpec, Component, create, renderToggleIn, rerenderIfPresentIn } from "../../framework/gui"
import { CloseButton } from "../../framework/gui/components/buttons"
import { onPlayerInit } from "../../framework/playerData"
import * as modGui from "mod-gui"
import { DataLayer, Layer, ViewLayer } from "../Layer"
import { PREFIX } from "../../constants"
import { registerFuncs } from "../../framework/funcRef"
import { registerHandlers } from "../../framework/events"
import { shallowArrayEquals } from "../../framework/util"

class TitleBar extends Component<Empty> {
  render(): AnySpec {
    return (
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
  }

  shouldComponentUpdate(): boolean {
    return false
  }
}

class LayersList extends Component<{ layers: Layer[]; playerSurfaceIndex: number; type: string }> {
  render(): AnySpec {
    const layers: Layer[] = this.props.layers
    return layers.length === 0 ? (
      <label caption="No Layers" />
    ) : (
      <list-box
        styleMod={{ width: 300 }}
        onSelectionStateChanged={LayerNavFuncs.teleport}
        tags={{ type: this.props.type }}
        onUpdate={(element) => {
          const currentSurface = this.props.playerSurfaceIndex
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

  shouldComponentUpdate(nextProps: { layers: Layer[]; playerSurfaceIndex: number }): boolean {
    const { playerSurfaceIndex, layers } = this.props
    return playerSurfaceIndex !== nextProps.playerSurfaceIndex || !shallowArrayEquals(layers, nextProps.layers)
  }
}

class LayerNavigator extends Component<Empty> {
  render(): AnySpec {
    const currentIndex = game.get_player(this.parentGuiElement.player_index).surface.index
    return (
      <frame created_direction={"vertical"} auto_center={true}>
        <TitleBar />
        <LayersList layers={DataLayer.getDataLayerUserOrder()} playerSurfaceIndex={currentIndex} type={"data"} />
        <LayersList layers={ViewLayer.getOrder()} playerSurfaceIndex={currentIndex} type={"view"} />
      </frame>
    )
  }
}

export const LayerNavFuncs = registerFuncs(
  {
    toggle({ player_index: playerIndex }: { player_index: number }) {
      renderToggleIn(game.get_player(playerIndex).gui.screen, "LayerNavigator", <LayerNavigator />)
    },
    teleport(element: ListBoxGuiElement) {
      const layerOrder = element.tags.type === "data" ? DataLayer.getDataLayerUserOrder() : ViewLayer.getOrder()
      const layer = layerOrder[element.selected_index - 1]
      const player = game.get_player(element.player_index)
      player.teleport(player.position, layer.surface)
    },
  },
  "LayerNavigator"
)

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
    rerenderIfPresentIn(game.get_player(event.player_index).gui.screen, "LayerNavigator", <LayerNavigator />)
  },
  // TODO on layers_changed event
  on_surface_deleted() {
    for (const [, player] of pairs(game.players)) {
      rerenderIfPresentIn(player.gui.screen, "LayerNavigator", <LayerNavigator />)
    }
  },
})
// TODO: make hotbar key thing too
