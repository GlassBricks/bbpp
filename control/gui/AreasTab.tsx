import Reactorio, { AnySpec, NoUpdateComponent, registerComponent } from "../../framework/gui"
import { BpGuiUpdate, WithBpGuiUpdate } from "./BpAreaEditorWindow"
import { BpArea } from "../BpArea"
import { teleportPlayerToArea } from "../playerAreaTracking"
import { HorizontalSpacer } from "../../framework/gui/components/Misc"
import { displayNotice } from "../../framework/gui/components/SimpleConfirmation"
import { startAreaPlacement } from "../areaPlacement"
import { AreasList } from "./AreasList"

function PosIntegerTextfield(props: { ref: string; initialValue?: number }): AnySpec {
  return (
    <textfield
      ref={props.ref}
      style={"short_number_textfield"}
      styleMod={{
        width: 50,
      }}
      clear_and_focus_on_right_click
      numeric
      allow_decimal={false}
      allow_negative={false}
      text={tostring(props.initialValue || "")}
    />
  )
}

@registerComponent()
export class AreasTab extends NoUpdateComponent implements WithBpGuiUpdate {
  bpGuiUpdate(update: BpGuiUpdate): void {
    ;(this.refs.areasList as AreasList).bpGuiUpdate(update)
  }

  teleportPlayer(bpArea: BpArea | undefined): void {
    if (bpArea) teleportPlayerToArea(this.getPlayer(), bpArea)
  }

  tryStartAreaPlacement(): void {
    const name = (this.refs.areaName as TextfieldGuiElement).text
    const sizeX = tonumber((this.refs.areaSizeX as TextfieldGuiElement).text)
    const sizeY = tonumber((this.refs.areaSizeY as TextfieldGuiElement).text)
    if (!sizeX || sizeX <= 0 || !sizeY || sizeY <= 0) {
      return displayNotice(this.getPlayer(), "Size dimensions must be greater than 0.")
    }
    const boundaryThickness = tonumber((this.refs.boundarySize as TextfieldGuiElement).text)
    if (!boundaryThickness || boundaryThickness <= 0) {
      return displayNotice(this.getPlayer(), "Boundary size must be greater than 0.")
    }
    startAreaPlacement(this.getPlayer(), name.length > 0 ? name : "unnamed", { x: sizeX, y: sizeY }, boundaryThickness)
  }

  protected create(): AnySpec {
    return (
      <table style={"bordered_table"} column_count={1}>
        <flow direction={"vertical"} name="areasListFlow" styleMod={{ horizontally_stretchable: true }}>
          <label style={"caption_label"} caption={"Areas on current surface"} tooltip={"Click to teleport to area"} />
          <AreasList kind={"list-box"} autoSelect onSelectedAreaChanged={this.funcs.teleportPlayer} ref={"areasList"} />
        </flow>
        <flow direction={"vertical"}>
          <label style={"caption_label"} caption={"New area"} />
          <flow style={"player_input_horizontal_flow"}>
            <label caption={"Name:"} />
            <HorizontalSpacer />
            <text-box clear_and_focus_on_right_click ref={"areaName"} />
          </flow>
          <flow style={"player_input_horizontal_flow"}>
            <label caption={"Size in chunks"} />
            <HorizontalSpacer />
            <label caption={"x:"} />
            <PosIntegerTextfield ref={"areaSizeX"} initialValue={5} />
            <label caption={"y:"} />
            <PosIntegerTextfield ref={"areaSizeY"} initialValue={5} />
          </flow>
          <flow style={"player_input_horizontal_flow"}>
            <label caption={"Boundary size:"} />
            <HorizontalSpacer />
            <PosIntegerTextfield ref={"boundarySize"} initialValue={3} />
          </flow>
          <flow>
            <HorizontalSpacer />
            <button style={"green_button"} caption={"Place area"} onClick={this.funcs.tryStartAreaPlacement} />
          </flow>
        </flow>
      </table>
    )
  }
}
