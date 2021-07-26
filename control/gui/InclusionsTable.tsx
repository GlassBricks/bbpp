import Reactorio, { AnySpec, ManualReactiveComponent, registerComponent } from "../../framework/gui"
import { AreaInclusion, BpArea, InclusionMode } from "../BpArea"
import { GuiConstants, Styles } from "../../constants"
import { userWarning } from "../../framework/logging"
import { SimpleConfirmation } from "../../framework/gui/components/SimpleConfirmation"
import { r } from "../../framework/funcRef"
import { imap } from "../../framework/util"
import { AreasUpdate, WithAreasUpdate } from "./BpGuiTab"

interface InclusionsTableProps {
  selectedArea: BpArea | false
  autoApply: boolean
}

interface InclusionControlTags {
  index: number
}

@registerComponent()
export class InclusionsTable extends ManualReactiveComponent<InclusionsTableProps> implements WithAreasUpdate {
  private static inclusionModes: LocalisedString[] = imap(InclusionMode, (_, name) => name)

  protected create(): AnySpec | undefined {
    const area = this.props.selectedArea
    return (
      <table column_count={6} style={Styles.inclusionsTable}>
        <empty-widget />
        <label caption={"Source area name"} style={"heading_3_label"} />
        <label caption={"Ghosts"} style={"heading_3_label"} />
        <label
          caption={"Mode"}
          tooltip={
            "None: including no entities. Used to temporarily hide entities or show only ghosts\n" +
            "Select: select only specific entities to include using the inclusion planner.\n" +
            "All: all entities are included."
          }
          style={"heading_3_label"}
        />
        <label caption={"Filters"} style={"heading_3_label"} />
        <empty-widget />

        {area &&
          area.getInclusions().flatMap((inclusion, index) => {
            return [
              <flow
                direction={"vertical"}
                styleMod={{
                  vertical_spacing: 0,
                }}
              >
                <button
                  caption={"^"}
                  style={Styles.moveButton}
                  tags={{ index }}
                  onClick={this.r(this.moveInclusionUp)}
                />
                <button
                  caption={"v"}
                  style={Styles.moveButton}
                  tags={{ index }}
                  onClick={this.r(this.moveInclusionDown)}
                />
              </flow>,
              <label
                caption={inclusion.sourceArea === area ? "<< self >> " : inclusion.sourceArea.name}
                styleMod={{
                  width: GuiConstants.Inclusions.nameWidth,
                }}
              />,
              <checkbox state={inclusion.ghosts} tags={{ index }} onCheckedStateChanged={this.r(this.setGhost)} />,
              <drop-down
                items={InclusionsTable.inclusionModes}
                selected_index={inclusion.includeMode}
                styleMod={{
                  width: GuiConstants.Inclusions.inclusionModeSelectionWidth,
                }}
                tags={{ index }}
                onSelectionStateChanged={this.r(this.setIncludeMode)}
              />,
              <button caption={"..."} style={"tool_button"} tags={{ index }} onClick={this.r(this.showFilters)} />,
              <button
                caption={"X"}
                style={"tool_button_red"}
                styleMod={{
                  padding: 0,
                }}
                tags={{ index }}
                onClick={this.r(this.showDeleteInclusionConfirmation)}
              />,
            ]
          })}
      </table>
    )
  }

  protected propsChanged(change: Partial<InclusionsTableProps>): void {
    if (change.selectedArea !== undefined) {
      this.rerender()
    }
  }

  areasUpdate(update: AreasUpdate): void {
    if ((update.inclusionsChanged && update.inclusionsChanged.area === this.props.selectedArea) || update.areaRenamed) {
      this.rerender()
    }
  }

  private getInclusion(element: BaseGuiElement): AreaInclusion | undefined {
    const index = (element.tags as InclusionControlTags).index
    const inclusion = (this.props.selectedArea as BpArea).getInclusions()[index]
    if (!inclusion) {
      userWarning(
        "Tried to do an inclusion control on an inclusion that no longer exists. " +
          "This should not happen; please report to the mod author."
      )
      return undefined
    }
    return inclusion
  }

  private moveInclusionUp(element: BaseGuiElement) {
    const inclusion = this.getInclusion(element)
    if (!inclusion) return
    inclusion.destinationArea.moveInclusionUp(inclusion)
    if (this.props.autoApply) inclusion.destinationArea.saveAndReset()
  }

  private moveInclusionDown(element: BaseGuiElement) {
    const inclusion = this.getInclusion(element)
    if (!inclusion) return
    inclusion.destinationArea.moveInclusionDown(inclusion)
    if (this.props.autoApply) inclusion.destinationArea.saveAndReset()
  }

  private setGhost(element: CheckboxGuiElement) {
    const inclusion = this.getInclusion(element)
    if (!inclusion) return
    inclusion.ghosts = element.state
    if (this.props.autoApply) inclusion.destinationArea.saveAndReset()
  }

  private setIncludeMode(element: DropDownGuiElement) {
    const inclusion = this.getInclusion(element)
    if (!inclusion) return
    inclusion.includeMode = element.selected_index
    if (this.props.autoApply) inclusion.destinationArea.saveAndReset()
  }

  private showFilters(element: ButtonGuiElement) {
    const inclusion = this.getInclusion(element)
    if (!inclusion) return
    inclusion.destinationArea.openInclusionFilters(this.getPlayer(), inclusion, this.props.autoApply)
  }

  private showDeleteInclusionConfirmation(element: ButtonGuiElement) {
    const inclusion = this.getInclusion(element)
    if (!inclusion) return
    SimpleConfirmation.display(this.getPlayer(), {
      title: "Confirmation",
      text: `Are you sure you want to delete the inclusion of "${inclusion.sourceArea.name}?"`,
      backText: "Back",
      confirmText: "Delete",
      redConfirm: true,
      onConfirm: r(InclusionsTable.deleteInclusion),
      data: inclusion,
    })
  }

  private static deleteInclusion(inclusion: AreaInclusion): void {
    inclusion.destinationArea.deleteInclusion(inclusion)
  }
}
