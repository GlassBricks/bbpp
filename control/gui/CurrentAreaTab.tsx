import { BpGuiUpdate, WithBpGuiUpdate } from "./BpAreaEditorWindow"
import Reactorio, { AnySpec, NoUpdateComponent, registerComponent } from "../../framework/gui"
import { AreasList } from "./AreasList"
import { HorizontalSpacer } from "../../framework/gui/components/Misc"
import { teleportPlayerToArea } from "../playerAreaTracking"
import { BpArea } from "../BpArea"

@registerComponent()
export class CurrentAreaTab extends NoUpdateComponent implements WithBpGuiUpdate {
  declare refs: {
    areaList: AreasList
    rename: ButtonGuiElement
    teleport: ButtonGuiElement
  }

  bpGuiUpdate(update: BpGuiUpdate): void {
    this.refs.areaList.bpGuiUpdate(update)
  }

  protected create(): AnySpec | undefined {
    return (
      <table style={"bordered_table"} column_count={1}>
        <flow direction="horizontal" styleMod={{ horizontally_stretchable: true }}>
          <label style={"caption_label"} caption={"Current area:"} />
          <HorizontalSpacer />
          <flow direction="vertical">
            <AreasList
              kind={"drop-down"}
              ref={"areaList"}
              autoSelect={true}
              onSelectedAreaChanged={this.r(this.onSelectedAreaChanged)}
            />
            <checkbox state={true} caption={"Sync area with player"} onCheckedStateChanged={this.r(this.setSync)} />
          </flow>
          <flow direction="vertical">
            <button ref={"rename"} caption={"rename"} enabled={false} />
            <button ref={"teleport"} caption={"teleport"} enabled={false} onClick={this.r(this.teleportPlayer)} />
          </flow>
        </flow>
      </table>
    )
  }

  private onSelectedAreaChanged(area: BpArea | undefined): void {
    this.refs.rename.enabled = area !== undefined
  }

  private setSync(el: CheckboxGuiElement): void {
    this.refs.areaList.setAutoSelect(el.state)
    this.refs.teleport.enabled = !el.state
  }

  private teleportPlayer(): void {
    const selected = this.refs.areaList.getSelectedArea()
    if (selected) teleportPlayerToArea(this.getPlayer(), selected)
  }
}
