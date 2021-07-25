import Reactorio, { AnySpec, registerComponent } from "../../framework/gui"
import { AreasUpdate, BpGuiTab, SelectedAreaProps } from "./BpGuiTab"
import { AreaSelector } from "./AreaSelector"
import { InclusionControls } from "./InclusionControls"
import { SimpleConfirmation } from "../../framework/gui/components/SimpleConfirmation"
import { r } from "../../framework/funcRef"
import { BpArea } from "../BpArea"
import { showResetAreaConfirmation } from "./resetAreaConfirmation"

@registerComponent()
export class AreaControlsTab extends BpGuiTab {
  // todo: actually localize
  declare refs: {
    areaSelector: AreaSelector

    outdatedNotification: LabelGuiElement

    inclusionControls: InclusionControls
    editButtonsFlow: FlowGuiElement

    deleteButton: ButtonGuiElement
  }

  protected create(): AnySpec | undefined {
    return (
      <table style={"bordered_table"} column_count={1}>
        <AreaSelector ref={"areaSelector"} {...this.props} />
        <flow direction={"vertical"}>
          <flow>
            <label style={"caption_label"} caption={"Save/reset"} />
            <label
              ref={"outdatedNotification"}
              caption={"Area may be outdated! Click Save or Reset to refresh the area."}
            />
          </flow>
          <flow ref={"editButtonsFlow"}>
            <button
              caption={"Save changes and reset"}
              style={"green_button"}
              styleMod={{ horizontally_stretchable: true }}
              onClick={this.r(this.saveChanges)}
            />
            <button
              caption={"Reset"}
              style={"red_button"}
              styleMod={{ horizontally_stretchable: true }}
              onClick={this.r(this.showResetAreaConfirmation)}
            />
          </flow>
        </flow>

        <InclusionControls ref={"inclusionControls"} selectedArea={this.props.selectedArea} />
        <button
          ref="deleteButton"
          caption={"Delete area"}
          style={"red_button"}
          onClick={this.r(this.showDeleteAreaConfirmation)}
        />
      </table>
    )
  }

  onCreated(): void {
    this.setOutdatedLabel()
  }

  protected propsChanged(change: Partial<SelectedAreaProps>): void {
    this.refs.areaSelector.mergeProps(change)
    if (change.selectedArea !== undefined) {
      this.refs.inclusionControls.mergeProps(change)
      this.setOutdatedLabel()
      const enabled = change.selectedArea !== false
      for (const button of this.refs.editButtonsFlow.children) {
        button.enabled = enabled
      }
      this.refs.deleteButton.enabled = enabled
    }
  }

  areasUpdate(update: AreasUpdate): void {
    this.refs.areaSelector.areasUpdate(update)
    this.refs.inclusionControls.areasUpdate(update)
    if (update.outdatedChanged && update.outdatedChanged === this.props.selectedArea) {
      this.setOutdatedLabel()
    }
  }

  private setOutdatedLabel(): void {
    this.refs.outdatedNotification.visible = this.props.selectedArea && this.props.selectedArea.isOutdated()
  }

  private saveChanges(): void {
    if (!this.props.selectedArea) return
    this.props.selectedArea.saveAndReset()
  }

  private showResetAreaConfirmation() {
    if (this.props.selectedArea) showResetAreaConfirmation(this.props.selectedArea, this.getPlayer())
  }

  private showDeleteAreaConfirmation(): void {
    const area = this.props.selectedArea
    if (!area) return
    SimpleConfirmation.display(this.getPlayer(), {
      title: "Confirmation",
      text: `Are you sure you want to delete the area "${area.name}?"`,
      backText: "Back",
      confirmText: "Delete",
      redConfirm: true,
      onConfirm: r(AreaControlsTab.deleteArea),
      data: area,
    })
  }

  private static deleteArea(area: BpArea) {
    area.delete()
  }
}
