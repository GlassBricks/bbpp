import Reactorio, { AnySpec, Component, registerComponent, renderIn, Window } from "../../framework/gui"
import { onPlayerInit, PlayerData } from "../../framework/playerData"
import { BpSet, UserArea } from "../BpArea"
import { registerHandlers } from "../../framework/events"
import { CloseButton } from "../../framework/gui/components/buttons"
import { PREFIX } from "../../constants"
import * as modGui from "mod-gui"
import { mapKeys } from "../../framework/util"
import { dlog } from "../../framework/logging"
import { add, getCenter, subtract } from "../../framework/position"

// player tracking
interface PlayerAreaCache {
  bpSet?: BpSet
  areaId?: number
}

const PlayerAreaCache = PlayerData<PlayerAreaCache>("AreaNav:PlayerPosition", (player) => {
  const surfaceIndex = player.surface.index
  return {
    bpSet: BpSet.getBySurfaceIndexOrNil(surfaceIndex),
    surfaceIndex,
  }
})

function playerChangedPosition(player: LuaPlayer) {
  const posCache = PlayerAreaCache.data[player.index]
  const bpSet = posCache.bpSet
  if (!bpSet) return

  const bpSize = bpSet.bpSize
  const position = player.position
  const blockX = Math.floor(position.x / bpSize.x)
  const blockY = Math.floor(position.y / bpSize.y)
  const areaId = bpSet.getAreaIdByBlock(blockX, blockY)

  if (posCache.areaId !== areaId) {
    posCache.areaId = areaId
    const current = AreaNavigator.window.currentOrNil(player.index)
    if (current) current.updateBpSet(bpSet.id)
  }
}

function playerChangedSurface(player: LuaPlayer) {
  const posCache = PlayerAreaCache.data[player.index]
  const surfaceIndex = player.surface.index
  const newBpSet = BpSet.getBySurfaceIndexOrNil(surfaceIndex)
  const oldBpSet = posCache.bpSet
  if (oldBpSet !== newBpSet) {
    posCache.bpSet = newBpSet
    if (oldBpSet) {
      const current = AreaNavigator.window.currentOrNil(player.index)
      if (current) current.updateBpSet(oldBpSet.id)
    }
    playerChangedPosition(player)
  }
}

registerHandlers({
  on_player_changed_position(e) {
    playerChangedPosition(game.get_player(e.player_index))
  },
  on_player_changed_surface(e) {
    playerChangedSurface(game.get_player(e.player_index))
  },
})

interface AreasListProps {
  bpSetId: number
  fullUpdate?: boolean
  areaId?: number
}

@registerComponent
class AreaNavAreaList extends Component<AreasListProps> {
  private lastAreaId: number = -1

  teleportPlayer(element: ListBoxGuiElement) {
    const bpSet = BpSet.getById(this.props.bpSetId)
    const areaId = bpSet.areaIds[element.selected_index - 1]
    const newArea = UserArea.getById(areaId)

    const player = game.get_player(element.player_index)
    const cache = PlayerAreaCache.data[element.player_index]
    if (cache.bpSet === bpSet && cache.areaId !== undefined) {
      const currentArea = UserArea.getById(cache.areaId)
      player.teleport(add(newArea.area[0], subtract(player.position, currentArea.area[0])), bpSet.surface)
    } else {
      player.teleport(getCenter(newArea.area), bpSet.surface)
    }
  }

  create(): AnySpec {
    const bpSet = BpSet.getById(this.props.bpSetId)
    const areaIds = bpSet.areaIds
    return (
      <frame direction="vertical" style="inside_shallow_frame">
        <label
          name="setNameLabel"
          caption={bpSet.name}
          styleMod={{
            font: "heading-2",
            left_margin: 5,
          }}
        />
        {areaIds.length === 0 ? (
          <label caption="No Layers" />
        ) : (
          <list-box
            onSelectionStateChanged={this.funcs.teleportPlayer}
            ref="listBox"
            onUpdate={(element) => {
              element.clear_items()
              for (let i = 1; i <= areaIds.length; i++) {
                const areaId = areaIds[i - 1]
                element.add_item(UserArea.getById(areaId).name)
              }
            }}
          />
        )}
      </frame>
    )
  }

  updateAreaId(areaId: number | undefined): void {
    if (areaId === this.lastAreaId) return

    const listBox = this.refs.listBox as ListBoxGuiElement | undefined
    if (!listBox) return
    if (!areaId) {
      listBox.selected_index = 0
    } else {
      const bpSet = BpSet.getById(this.props.bpSetId)
      const areaIds = bpSet.areaIds
      const selectedIndex = areaIds.indexOf(areaId) + 1
      listBox.selected_index = selectedIndex
      if (selectedIndex !== 0) {
        ;(this.parentGuiElement as ScrollPaneGuiElement).scroll_to_element(this.firstGuiElement)
      }
    }
  }

  protected update(prevProps: AreasListProps): void {
    const fullUpdate = this.props.fullUpdate || prevProps.bpSetId !== this.props.bpSetId
    if (fullUpdate) this.applySpec(this.create())
    this.updateAreaId(this.props.areaId)
  }
}

@registerComponent
export class AreaNavigator extends Component<Empty> {
  static window = new Window<AreaNavigator>(AreaNavigator)

  static toggle({ player_index }: { player_index: number }): void {
    AreaNavigator.window.toggle(game.get_player(player_index))
  }

  create(): AnySpec {
    const currentAreaId = PlayerAreaCache.data[this.parentGuiElement.player_index].areaId
    return (
      <frame
        direction="vertical"
        auto_center
        styleMod={{
          width: 300,
          maximal_height: 1000,
          vertically_stretchable: false,
        }}
      >
        <flow // titlebar
          direction="horizontal"
          styleMod={{ horizontal_spacing: 8, height: 28 }}
          onCreated={(e) => {
            e.drag_target = e.parent
          }}
        >
          <label caption="Area Navigator" style="frame_title" ignored_by_interaction />
          <empty-widget style="flib_titlebar_drag_handle" ignored_by_interaction />
          <CloseButton onClick={AreaNavigator.funcs().toggle} />
        </flow>
        <scroll-pane
          horizontal_scroll_policy="never"
          styleMod={{
            maximal_height: 500,
            vertically_stretchable: false,
          }}
        >
          {mapKeys(BpSet.bpSetById(), (id) => (
            <AreaNavAreaList bpSetId={id} areaId={currentAreaId} ref={id} />
          ))}
        </scroll-pane>
      </frame>
    )
  }

  updateBpSet(id: number): void {
    const navList = this.refs[id] as AreaNavAreaList
    if (!navList) {
      dlog(`WARNING: bpSet with id ${id} not found!`)
    } else {
      const currentAreaId = PlayerAreaCache.data[this.parentGuiElement.player_index].areaId
      navList.updateAreaId(currentAreaId)
    }
  }

  update(): void {
    if (this.props.fullUpdate) return this.applySpec(this.create())
  }
}

onPlayerInit((player) => {
  const button = (
    <button
      name={PREFIX + "LayerNavigatorButton"}
      style={modGui.button_style}
      caption="AN"
      mouse_button_filter={["left"]}
      onClick={AreaNavigator.funcs().toggle}
    />
  )
  renderIn(modGui.get_button_flow(player), "bbpp:AreaNavigator", button)
})

// TODO: make hotbar name thing too
