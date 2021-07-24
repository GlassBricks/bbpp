import Reactorio, { AnySpec, registerComponent } from "../../framework/gui"
import { NewAreaBox } from "./NewAreaBox"
import { AreaSelector } from "./AreaSelector"
import { AreasList } from "./AreasList"
import { AreasUpdate, BpGuiTab, SelectedAreaProps } from "./BpGuiTab"

@registerComponent()
export class AreasTab extends BpGuiTab {
  declare refs: {
    areasList: AreaSelector
  }

  protected create(): AnySpec | undefined {
    return (
      <table style={"bordered_table"} column_count={1}>
        <flow direction="vertical" styleMod={{ horizontally_stretchable: true }}>
          <label style={"caption_label"} caption={"All areas"} tooltip={"Select to teleport to area"} />
          <AreasList
            ref={"areasList"}
            kind={"list-box"}
            selectedArea={this.props.selectedArea}
            onSelectedAreaChanged={this.props.setSelectedArea}
          />
        </flow>
        <NewAreaBox />
      </table>
    )
  }

  areasUpdate(update: AreasUpdate): void {
    this.refs.areasList.areasUpdate(update)
  }

  protected propsChanged(change: Partial<SelectedAreaProps>): void {
    this.refs.areasList.mergeProps(change)
  }
}
