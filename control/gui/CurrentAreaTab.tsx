import { BpGuiUpdate, WithBpGuiUpdate } from "./BpAreaEditorWindow"
import Reactorio, { AnySpec, NoUpdateComponent, registerComponent } from "../../framework/gui"
import { AreasList } from "./AreasList"
import { HorizontalSpacer } from "../../framework/gui/components/Misc"
import { teleportPlayerToArea } from "../playerAreaTracking"
import { BpArea } from "../BpArea"

@registerComponent()
export class CurrentAreaTab extends NoUpdateComponent implements WithBpGuiUpdate {
  bpGuiUpdate(update: BpGuiUpdate): void {
    ;(this.refs.areaList as AreasList).bpGuiUpdate(update)
  }

  _onSelectedAreaChanged(area: BpArea | undefined): void {
    ;(this.refs.rename as ButtonGuiElement).enabled = area !== undefined
  }

  _setSync(el: CheckboxGuiElement): void {
    ;(this.refs.areaList as AreasList).setAutoSelect(el.state)
    ;(this.refs.teleportButton as ButtonGuiElement).enabled = !el.state
  }

  _teleportPlayer(): void {
    const selected = (this.refs.areaList as AreasList).getSelectedArea()
    if (selected) teleportPlayerToArea(this.getPlayer(), selected)
  }

  protected create(): AnySpec | undefined {
    return (
      <table style={"bordered_table"} column_count={1}>
        <flow direction="horizontal" styleMod={{ horizontally_stretchable: true }}>
          <label style={"caption_label"} caption={"Current area:"} />
          <flow direction="vertical">
            <AreasList
              kind={"drop-down"}
              ref={"areaList"}
              autoSelect={true}
              onSelectedAreaChanged={this.funcs._onSelectedAreaChanged}
            />
            <checkbox state={true} caption={"Sync area with player"} onCheckedStateChanged={this.funcs._setSync} />
          </flow>
          <HorizontalSpacer />
          <flow direction="vertical">
            <button caption={"rename"} ref={"rename"} enabled={false} />
            <button caption={"teleport"} enabled={false} ref={"teleportButton"} onClick={this.funcs._teleportPlayer} />
          </flow>
        </flow>
        <flow direction={"vertical"}></flow>
      </table>
    )
  }
}
