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
      <table column_count={5} style={Styles.inclusionsTable}>
        <empty-widget />
        <label caption={"Source area name"} style={"heading_3_label"} />
        <label caption={"Ghost"} style={"heading_3_label"} />
        <label caption={"Include mode"} style={"heading_3_label"} />
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
    if (update.inclusionsChanged || update.areaRenamed) {
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
  }

  private moveInclusionDown(element: BaseGuiElement) {
    const inclusion = this.getInclusion(element)
    if (!inclusion) return
    inclusion.destinationArea.moveInclusionDown(inclusion)
  }

  private setGhost(element: CheckboxGuiElement) {
    const inclusion = this.getInclusion(element)
    if (!inclusion) return
    inclusion.ghosts = element.state
  }

  private setIncludeMode(element: DropDownGuiElement) {
    const inclusion = this.getInclusion(element)
    if (!inclusion) return
    inclusion.includeMode = element.selected_index
  }

  private showDeleteInclusionConfirmation(element: ButtonGuiElement) {
    const inclusion = this.getInclusion(element)
    if (!inclusion) return
    SimpleConfirmation.display(this.getPlayer(), {
      title: "Confirmation",
      text: `Are you sure you want to remove the inclusion of "${inclusion.sourceArea.name}?"`,
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
