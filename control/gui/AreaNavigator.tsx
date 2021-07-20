import Reactorio, { AnySpec, Component, registerComponent } from "../../framework/gui"
import { PlayerArea, teleportPlayerToArea } from "../playerAreaTracking"
import { BpGuiUpdate } from "./BpAreaEditor"
import { BpSurface } from "../BpArea"

@registerComponent()
export class AreaNavigator extends Component<BpGuiUpdate> {
  teleportPlayer(element: ListBoxGuiElement) {
    const bpSurface = BpSurface.get(this.getPlayer().surface)
    const area = bpSurface.areas[element.selected_index - 1]
    teleportPlayerToArea(this.getPlayer(), area)
  }

  create(): AnySpec {
    const areas = BpSurface.get(this.getPlayer().surface).areas
    return (
      <flow direction={"vertical"}>
        <label style={"caption_label"} caption={"Areas on current surface"} />
        <scroll-pane
          horizontal_scroll_policy="never"
          styleMod={{
            maximal_height: 500,
            horizontally_stretchable: true,
          }}
        >
          {areas.length === 0 ? (
            <label caption="No Areas" />
          ) : (
            <list-box
              onSelectionStateChanged={this.funcs.teleportPlayer}
              ref="listBox"
              onUpdate={(element) => {
                element.items = areas.map((x) => x.name)
              }}
            />
          )}
        </scroll-pane>
      </flow>
    )
  }

  protected update(_: BpGuiUpdate, firstUpdate: boolean): void {
    if (firstUpdate) {
      return this.updateAreaId()
    }
    if (this.props.playerChangedSurface) {
      this.applySpec(this.create())
    }
    if (this.props.playerChangedArea) {
      this.updateAreaId()
    }
  }

  private updateAreaId(): void {
    const listBox = this.refs.listBox as ListBoxGuiElement | undefined
    if (!listBox) return
    const player = this.getPlayer()
    const bpArea = PlayerArea.get(player)
    if (bpArea === undefined) {
      listBox.selected_index = 0
      return
    }
    const bpSurface = BpSurface.get(player.surface)
    const selectedIndex = bpSurface.areas.indexOf(bpArea) + 1
    listBox.selected_index = selectedIndex
    if (selectedIndex !== 0) {
      ;(this.parentGuiElement as ScrollPaneGuiElement).scroll_to_element(this.firstGuiElement)
      listBox.scroll_to_item(selectedIndex)
    }
  }
}
