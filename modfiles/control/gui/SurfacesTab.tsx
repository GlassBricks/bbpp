import Reactorio, { AnySpec, registerComponent } from "../../framework/gui"
import { HorizontalSpacer } from "../../framework/gui/components/Misc"
import { displayNotice } from "../../framework/gui/components/SimpleConfirmation"
import { map } from "../../framework/util"
import { createEmptySurface } from "../surfaces"
import { r } from "../../framework/funcRef"
import { AreasUpdate, BpGuiTab } from "./BpGuiTab"

@registerComponent()
export class SurfacesTab extends BpGuiTab {
  declare refs: {
    surfaceListBox: ListBoxGuiElement
    newSurfaceName: TextfieldGuiElement
  }

  protected create(): AnySpec | undefined {
    return (
      <table style={"bordered_table"} column_count={1}>
        {/* Surface list */}
        <flow direction={"vertical"} styleMod={{ horizontally_stretchable: true }}>
          <label caption={"All surfaces"} tooltip={"Click to teleport to surface"} style={"caption_label"} />
          <list-box
            ref={"surfaceListBox"}
            onSelectionStateChanged={r(SurfacesTab.teleportPlayerToSurface)}
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
            <textfield ref={"newSurfaceName"} clear_and_focus_on_right_click />
          </flow>
          <flow>
            <HorizontalSpacer />
            <button style={"green_button"} caption={"Create"} onClick={this.r(this.createBpSurface)} />
          </flow>
        </flow>
      </table>
    )
  }

  onCreated(): void {
    this.updateSurfaceListBox()
  }

  areasUpdate(update: AreasUpdate): void {
    if (update.surfaceCreated || update.surfaceDeleted || update.surfaceRenamed) {
      this.updateSurfaceListBox()
    } else if (update.playerChangedSurface) {
      this.updateSelectedSurface()
    }
  }

  protected propsChanged(): void {
    // noop
  }

  private static teleportPlayerToSurface(el: ListBoxGuiElement): void {
    const player = game.get_player(el.player_index)
    const surface = game.get_surface(el.items[el.selected_index - 1] as string)
    player.teleport(player.position, surface)
  }

  createBpSurface(): void {
    const surfaceName = this.refs.newSurfaceName.text
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

  private updateSurfaceListBox(): void {
    this.refs.surfaceListBox.items = map(game.surfaces, (_, s) => s.name)
    this.updateSelectedSurface()
  }

  private updateSelectedSurface(): void {
    const surface = this.getPlayer().surface
    const surfaceList = this.refs.surfaceListBox
    const index = surfaceList.items.indexOf(surface.name) + 1
    surfaceList.selected_index = index
    if (index !== 0) {
      surfaceList.scroll_to_item(index)
    }
  }
}
