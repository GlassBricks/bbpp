/*
import createElement, { AnySpec, Component, registerComponent } from "../../framework/gui"
import { shallowArrayEquals } from "../../framework/util"
import { BpArea, BpAreaType } from "../bparea/BpArea"

// @registerComponent
// class TitleBar extends StaticComponent {
//   create(): AnySpec {
//     return (
//       <flow
//         direction={"horizontal"}
//         styleMod={{ horizontal_spacing: 8, height: 28 }}
//         drag_target={this.parentGuiElement}
//       >
//         <label caption={"Layer Navigator"} style={"frame_title"} ignored_by_interaction />
//         <empty-widget style={"flib_titlebar_drag_handle"} ignored_by_interaction />
//         <CloseButton onClick={LayerNavFuncs.toggle} />
//       </flow>
//     )
//   }
// }
//

// todo: track player entering areas?
interface AreasListProps {
  areas: BpArea[]
  type: BpAreaType
}

@registerComponent
class AreasList extends Component<AreasListProps> {
  layersUpdated = true

  static teleportPlayer(e: ListBoxGuiElement){

  }

  update({ areas }: AreasListProps): AnySpec {
    return areas.length === 0 ? (
      <label caption="No Layers" />
    ) : (
      <list-box
        onSelectionStateChanged={LayerNavFuncs.teleport}
        tags={{ type: props.key }}
        onUpdate={(element) => {
          const currentSurface = props.playerSurfaceIndex
          if (this.layersUpdated) {
            element.clear_items()
            for (const [, layer] of ipairs(layers)) {
              element.add_item(layer.name)
            }
          }
          if (this.playerSurfaceUpdated) {
            let selectedIndex = 0
            for (const [i, layer] of ipairs(layers)) {
              if (currentSurface === layer.surface.index) {
                selectedIndex = i
              }
            }
            element.selected_index = selectedIndex
          }
        }}
      />
    )
  }

  shouldComponentUpdate(prevProps: AreasListProps, nextProps: AreasListProps): boolean {
    this.playerSurfaceUpdated = prevProps.playerSurfaceIndex !== nextProps.playerSurfaceIndex
    this.layersUpdated = !shallowArrayEquals(prevProps.layers, nextProps.layers)
    return this.playerSurfaceUpdated || this.layersUpdated
  }
}
@registerComponent
export class LayerNavigator extends Component {
  create(): AnySpec {
    return (
      <frame direction={"vertical"} auto_center styleMod={{ width: 300 }}>
        <TitleBar />
        <LayersList deferProps key="data" />
        <LayersList deferProps key="view" />
      </frame>
    )
  }

  update(): AnySpec | undefined {
    const currentIndex = game.get_player(this.parentGuiElement.player_index).surface.index
    // todo even smarter updates
    return (
      <frame updateOnly>
        <LayersList
          key="data"
          layers={shallowCopy(DataLayer.getDataLayerUserOrder())}
          playerSurfaceIndex={currentIndex}
        />
        <LayersList key="view" layers={shallowCopy(ViewLayer.getOrder())} playerSurfaceIndex={currentIndex} />
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
  createIn(modGui.get_button_flow(player), button)
})

registerHandlers({
  on_player_changed_surface(event) {
    renderIfPresentIn(game.get_player(event.player_index).gui.screen, "LayerNavigator", <LayerNavigator />)
  },
  // TODO on layers_changed event
  on_surface_deleted() {
    for (const [, player] of pairs(game.players)) {
      renderIfPresentIn(player.gui.screen, "LayerNavigator", <LayerNavigator />)
    }
  },
})
// TODO: make hotbar key thing too
*/
