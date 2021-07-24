import Reactorio, { AnySpec, NoPropComponent, registerComponent } from "../../framework/gui"
import { HorizontalSpacer } from "../../framework/gui/components/Misc"
import { displayNotice } from "../../framework/gui/components/SimpleConfirmation"
import { startAreaPlacement } from "../areaPlacement"

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
export class NewAreaControls extends NoPropComponent {
  declare refs: {
    areaName: TextfieldGuiElement
    areaSizeX: TextfieldGuiElement
    areaSizeY: TextfieldGuiElement
    boundarySize: TextfieldGuiElement
  }

  protected create(): AnySpec {
    return (
      <flow direction={"vertical"}>
        <label style={"caption_label"} caption={"New area"} />
        <flow style={"player_input_horizontal_flow"}>
          <label caption={"Name:"} />
          <HorizontalSpacer />
          <textfield clear_and_focus_on_right_click ref={"areaName"} />
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
          <button
            style={"green_button"}
            caption={"Select area location..."}
            onClick={this.r(this.tryStartAreaPlacement)}
          />
        </flow>
      </flow>
    )
  }

  tryStartAreaPlacement(): void {
    const name = this.refs.areaName.text
    const sizeX = tonumber(this.refs.areaSizeX.text)
    const sizeY = tonumber(this.refs.areaSizeY.text)
    if (!sizeX || sizeX <= 0 || !sizeY || sizeY <= 0) {
      return displayNotice(this.getPlayer(), "Size dimensions must be greater than 0.")
    }
    const boundaryThickness = tonumber(this.refs.boundarySize.text)
    if (!boundaryThickness || boundaryThickness <= 0) {
      return displayNotice(this.getPlayer(), "Boundary size must be greater than 0.")
    }
    startAreaPlacement(this.getPlayer(), name.length > 0 ? name : "unnamed", { x: sizeX, y: sizeY }, boundaryThickness)
  }
}
