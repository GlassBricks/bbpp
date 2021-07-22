import Reactorio, { AnySpec, NoUpdateComponent, registerComponent } from "../../framework/gui"
import { callFuncRef, FuncRef } from "../../framework/funcRef"
import { BpArea, BpSurface } from "../BpArea"
import { BpGuiUpdate, WithBpGuiUpdate } from "./BpAreaEditorWindow"
import { PlayerArea } from "../playerAreaTracking"

export interface AreasListProps {
  kind: "list-box" | "drop-down"
  onSelectedAreaChanged?: FuncRef<(area: BpArea | undefined) => void>
  autoSelect?: boolean
}

/**
 * Only prop update supported is _autoSelect_
 */
@registerComponent()
export class AreasList extends NoUpdateComponent<AreasListProps> implements WithBpGuiUpdate {
  private autoSelect?: boolean

  onCreated(): void {
    this.autoSelect = this.props.autoSelect
    if (this.autoSelect) this.autoSelectAreaId()
  }

  bpGuiUpdate(update: BpGuiUpdate): void {
    const bpSurface = BpSurface.get(this.getPlayer().surface)
    if (
      update.playerChangedSurface ||
      (update.areaCreated && update.areaCreated.bpSurface === bpSurface) ||
      (update.areaDeleted && update.areaDeleted.bpSurface === bpSurface)
    ) {
      this.applySpec(this.create())
      return
    }
    if (this.autoSelect && update.playerChangedArea) {
      this.autoSelectAreaId()
    }
  }

  setAutoSelect(autoSelect: boolean): void {
    this.autoSelect = autoSelect
    if (autoSelect) this.autoSelectAreaId()
  }

  _onSelectionStateChanged(): void {
    if (this.props.onSelectedAreaChanged) this.triggerSelectedArea(this.getSelectedArea())
  }

  getSelectedArea(): BpArea | undefined {
    const index = (this.refs.listBox as ListBoxGuiElement | DropDownGuiElement).selected_index
    if (index === 0) return undefined
    const surface = BpSurface.get(this.getPlayer().surface)
    return surface.areas[index - 1]
  }

  protected create(): AnySpec | undefined {
    const bpSurface = BpSurface.get(this.getPlayer().surface)
    const areas = bpSurface.areas
    return (
      <this.props.kind
        ref={"listBox"}
        onSelectionStateChanged={this.funcs._onSelectionStateChanged}
        onUpdate={(element) => {
          element.items = areas.map((x) => x.name)
        }}
        styleMod={{
          maximal_height: 300,
        }}
      />
    )
  }

  private autoSelectAreaId(): void {
    const list = this.refs.listBox as ListBoxGuiElement | DropDownGuiElement
    const player = this.getPlayer()
    const bpArea = PlayerArea.get(player)
    const selectedIndex = bpArea === undefined ? 0 : BpSurface.get(player.surface).areas.indexOf(bpArea) + 1
    const oldSelectedIndex = list.selected_index

    list.selected_index = selectedIndex
    if (selectedIndex !== 0 && list.type === "list-box") {
      list.scroll_to_item(selectedIndex)
    }
    if (selectedIndex !== oldSelectedIndex) {
      this.triggerSelectedArea(bpArea)
    }
  }

  private triggerSelectedArea(area: BpArea | undefined) {
    const func = this.props.onSelectedAreaChanged
    if (func) callFuncRef(func, area)
  }
}
