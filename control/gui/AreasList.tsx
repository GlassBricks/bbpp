import Reactorio, {
  AnySpec,
  callGuiFunc,
  GuiFunc,
  ManualReactiveComponent,
  registerComponent,
} from "../../framework/gui"
import { BpArea } from "../BpArea"
import { isEmpty, map } from "../../framework/util"
import { AreasUpdate, WithAreasUpdate } from "./BpGuiTab"
import { GuiConstants } from "../../constants"

export interface AreasListProps {
  kind: "list-box" | "drop-down"
  selectedArea: BpArea | false

  onSelectedAreaChanged?: GuiFunc<(area: BpArea | undefined) => void>
}

@registerComponent()
export class AreasList extends ManualReactiveComponent<AreasListProps> implements WithAreasUpdate {
  declare refs: {
    listBox: ListBoxGuiElement | DropDownGuiElement
  }

  // todo: better indexing
  private areas!: BpArea[]

  protected create(): AnySpec | undefined {
    const areas = BpArea.areasById()
    return (
      <this.props.kind
        ref={"listBox"}
        onSelectionStateChanged={this.r(this.onSelectionStateChanged)}
        onUpdate={(element) => {
          this.areas = map(areas, (_, value) => value)
          element.items = map(areas, (_, area) => area.name)
          element.enabled = !isEmpty(areas)
        }}
        styleMod={{
          maximal_height: GuiConstants.areaListHeight,
          minimal_width: GuiConstants.areaListWidth,
          horizontally_stretchable: true,
        }}
      />
    )
  }

  onCreated(): void {
    this.setSelectedArea(this.props.selectedArea)
  }

  areasUpdate(update: AreasUpdate): void {
    if (update.areaDeleted) {
      if (this.props.selectedArea && update.areaDeleted.id === this.props.selectedArea.id) {
        this.rerender()
        callGuiFunc(this.props.onSelectedAreaChanged, undefined)
      }
    }
    if (update.areaCreated || update.areaRenamed) {
      this.rerender()
    }
  }

  protected propsChanged(change: Partial<AreasListProps>): void {
    if (change.selectedArea !== undefined) {
      this.setSelectedArea(change.selectedArea)
      this.props.selectedArea = change.selectedArea
    }
  }

  private onSelectionStateChanged(): void {
    const index = this.refs.listBox.selected_index
    const selectedArea = index !== 0 ? this.areas[index - 1] : undefined
    callGuiFunc(this.props.onSelectedAreaChanged, selectedArea)
  }

  private setSelectedArea(bpArea: BpArea | false) {
    const list = this.refs.listBox
    const selectedIndex = bpArea ? this.areas.indexOf(bpArea) + 1 : 0

    list.selected_index = selectedIndex
    if (selectedIndex !== 0 && list.type === "list-box") {
      list.scroll_to_item(selectedIndex)
    }
  }
}
