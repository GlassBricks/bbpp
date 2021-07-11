import Reactorio, { AnySpec, Component, registerComponent, renderIn, Window } from "../../framework/gui"
import { BpSet } from "../BpArea"
import { CloseButton } from "../../framework/gui/components/buttons"
import * as modGui from "mod-gui"
import { mapKeys } from "../../framework/util"
import { dlog } from "../../framework/logging"
import { PlayerArea, teleportPlayerToArea } from "../playerAreaTracking"
import { onPlayerInit } from "../../framework/onPlayerInit"

interface AreasListProps {
  bpSetId: number
  fullUpdate?: boolean
  areaId?: number
}

@registerComponent
class AreaNavAreaList extends Component<AreasListProps> {
  private lastAreaId: number | undefined

  teleportPlayer(element: ListBoxGuiElement) {
    const bpSet = BpSet.getById(this.props.bpSetId)
    const area = bpSet.areas[element.selected_index - 1]
    teleportPlayerToArea(game.get_player(element.player_index), area)
  }

  create(): AnySpec {
    const bpSet = BpSet.getById(this.props.bpSetId)
    const areas = bpSet.areas
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
        {areas.length === 0 ? (
          <label caption="No Layers" />
        ) : (
          <list-box
            onSelectionStateChanged={this.funcs.teleportPlayer}
            ref="listBox"
            onUpdate={(element) => {
              element.clear_items()
              for (const area of areas) {
                element.add_item(area.name)
              }
            }}
          />
        )}
      </frame>
    )
  }

  updateAreaId(areaId: number | undefined): void {
    if (areaId === this.lastAreaId) return
    this.lastAreaId = areaId

    const listBox = this.refs.listBox as ListBoxGuiElement | undefined
    if (!listBox) return
    if (!areaId) {
      listBox.selected_index = 0
    } else {
      const bpSet = BpSet.getById(this.props.bpSetId)
      const selectedIndex = bpSet.areas.findIndex((v) => v.id === areaId) + 1
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
    const currentArea = PlayerArea.get(this.parentGuiElement.player_index).area
    const currentAreaId = currentArea && currentArea.id
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

  updateAreaList(bpSetId: number, areaId: number | undefined): void {
    const navList = this.refs[bpSetId] as AreaNavAreaList
    if (!navList) {
      dlog(`WARNING: bpSet with id ${bpSetId} not found!`)
    } else {
      navList.updateAreaId(areaId)
    }
  }

  update(): void {
    if (this.props.fullUpdate) return this.applySpec(this.create())
  }
}

PlayerArea.addObserver((playerIndex, oldValue, newValue) => {
  const currentNav = AreaNavigator.window.currentOrNil(playerIndex)
  if (!currentNav) return

  if (oldValue.bpSet !== newValue.bpSet) {
    if (oldValue.bpSet) {
      currentNav.updateAreaList(oldValue.bpSet.id, undefined) // clear selected
    }
    if (newValue.area) {
      currentNav.updateAreaList(newValue.bpSet!.id, newValue.area.id) // set new
    }
  } else if (oldValue.area !== newValue.area && newValue.bpSet) {
    currentNav.updateAreaList(newValue.bpSet.id, newValue.area && newValue.area.id)
  }
})

onPlayerInit((player) => {
  const button = (
    <button
      name={"bbpp:AreaNavigatorButton"}
      style={modGui.button_style}
      caption="AN"
      mouse_button_filter={["left"]}
      onClick={AreaNavigator.funcs().toggle}
    />
  )
  renderIn(modGui.get_button_flow(player), "bbpp:AreaNavigator", button)
})

// TODO: make hotbar name thing too
