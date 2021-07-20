import Reactorio, { AnySpec, Component, registerComponent } from "../../framework/gui"
import { HorizontalSpacer } from "../../framework/gui/components/Misc"
import { displayNotice } from "../../framework/gui/components/SimpleConfirmation"
import { BpGuiUpdate } from "./BpAreaEditor"
import { map } from "../../framework/util"
import { createEmptySurface } from "../surfaces"

/*
function PosIntegerTextfield(props: { ref: string; initialValue?: number }): AnySpec {
  return (
    <textfield
      ref={props.ref}
      style={"short_number_textfield"}
      styleMod={{
        width: 50,
      }}
      numeric
      allow_decimal={false}
      allow_negative={false}
      text={tostring(props.initialValue || "")}
    />
  )
}
*/

@registerComponent()
export class BpSurfacesTab extends Component<BpGuiUpdate> {
  static teleportPlayer(el: ListBoxGuiElement): void {
    const player = game.get_player(el.player_index)
    const surface = game.get_surface(el.items[el.selected_index - 1] as string)
    player.teleport(player.position, surface)
  }

  updateSurfaceListBox(): void {
    const surfaceNames: string[] = map(game.surfaces, (_, s) => s.name)
    const surfaceList = this.refs.surfaceListBox as ListBoxGuiElement
    surfaceList.items = surfaceNames
    this.updateSelectedSurface()
  }

  updateSelectedSurface(): void {
    const surface = this.getPlayer().surface
    const surfaceList = this.refs.surfaceListBox as ListBoxGuiElement
    const index = surfaceList.items.indexOf(surface.name) + 1
    surfaceList.selected_index = index
    if (index !== 0) {
      surfaceList.scroll_to_item(index)
    }
  }

  createBpSurface(): void {
    const surfaceName = (this.refs.newSurfaceName as TextfieldGuiElement).text
    const player = this.getPlayer()
    if (surfaceName.length === 0) {
      return displayNotice(player, "A surface name is required to create a blueprint surface.")
    }
    if (game.get_surface(surfaceName)) {
      return displayNotice(player, "A surface with the given name already exists.")
    }
    const surface = createEmptySurface(surfaceName)
    player.teleport([0, 0], surface)
  }

  protected create(): AnySpec | undefined {
    return (
      <table style={"bordered_table"} column_count={1}>
        {/*
           current surface
          <flow direction={"vertical"} name={"currentSurfaceControls"} ref={"currentSurfaceControls"}>
            <button caption={"deactivate all entities"} />
            <button caption={"activate all entities"} />
          </flow>
*/}
        {/* Surface list */}
        <flow direction={"vertical"}>
          <label caption={"All surfaces"} tooltip={"Click to teleport to surface"} style={"caption_label"} />
          <list-box
            ref={"surfaceListBox"}
            onSelectionStateChanged={BpSurfacesTab.funcs().teleportPlayer}
            styleMod={{
              maximal_height: 300,
            }}
          />
        </flow>
        {/* New blueprint surface */}
        <flow direction={"vertical"}>
          <label caption={"New empty surface"} style={"caption_label"} />
          <flow style={"player_input_horizontal_flow"}>
            <label caption={"Name:"} />
            <HorizontalSpacer />
            <textfield ref={"newSurfaceName"} />
          </flow>
          <flow>
            <HorizontalSpacer />
            <button style={"green_button"} caption={"Create"} onClick={this.funcs.createBpSurface} />
          </flow>
        </flow>
      </table>
    )
  }

  protected update(_: BpGuiUpdate, firstUpdate: boolean): void {
    // todo?
    if (firstUpdate) {
      return this.fullUpdate()
    }
    if (this.props.surfaceCreated || this.props.surfaceDeleted || this.props.surfaceRenamed) {
      this.updateSurfaceListBox()
    } else if (this.props.playerChangedSurface) {
      this.updateSelectedSurface()
    }
  }

  private fullUpdate() {
    this.updateSurfaceListBox()
  }
}
