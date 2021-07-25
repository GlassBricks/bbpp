import Reactorio, { AnySpec, ManualReactiveComponent, registerComponent } from "../../framework/gui"
import { InclusionsTable } from "./InclusionsTable"
import { AreasList } from "./AreasList"
import { BpArea } from "../BpArea"
import { displayNotice } from "../../framework/gui/components/SimpleConfirmation"
import { startInclusionPlacement } from "../inclusionPlacement"
import { AreasUpdate, WithAreasUpdate } from "./BpGuiTab"
import { showResetAreaConfirmation } from "./resetAreaConfirmation"
import { HorizontalSpacer } from "../../framework/gui/components/Misc"

interface InclusionControlsProps {
  selectedArea: BpArea | false
}

@registerComponent()
export class InclusionControls extends ManualReactiveComponent<InclusionControlsProps> implements WithAreasUpdate {
  private areaToInclude: BpArea | undefined

  declare refs: {
    inclusionsTable: InclusionsTable

    resetButton: ButtonGuiElement

    addNewInclusionList: AreasList

    includeAtCenter: ButtonGuiElement
    placeInclusion: ButtonGuiElement
  }

  protected create(): AnySpec | undefined {
    return (
      <flow direction={"vertical"}>
        <label style="caption_label" caption={"Inclusions"} />
        <InclusionsTable ref="inclusionsTable" selectedArea={this.props.selectedArea} />
        <flow>
          <HorizontalSpacer />
          <button
            ref={"resetButton"}
            caption={"Apply inclusion changes (resets area)"}
            onClick={this.r(this.showResetAreaConfirmation)}
          />
        </flow>
        <line direction={"horizontal"} />
        <flow>
          <label caption={"Add inclusion from: "} />
          <flow direction={"vertical"}>
            <AreasList
              ref={"addNewInclusionList"}
              kind={"drop-down"}
              selectedArea={false}
              onSelectedAreaChanged={this.r(this.setAreaToInclude)}
            />
            <flow>
              <button
                ref={"includeAtCenter"}
                caption={"Include at center"}
                onClick={this.r(this.addInclusionAtCenter)}
                enabled={false}
              />
              <button
                ref={"placeInclusion"}
                caption={"Select location to include..."}
                onClick={this.r(this.tryStartInclusionPlacement)}
                enabled={false}
              />
            </flow>
          </flow>
        </flow>
      </flow>
    )
  }

  onCreated(): void {
    this.setAreaToInclude(undefined)
    this.propsChanged(this.props)
  }

  protected propsChanged(change: Partial<InclusionControlsProps>): void {
    if (change.selectedArea !== undefined) {
      this.refs.inclusionsTable.mergeProps(change)
      this.refs.resetButton.enabled = change.selectedArea !== false
      this.setAreaToInclude(this.areaToInclude)
    }
  }

  areasUpdate(update: AreasUpdate): void {
    this.refs.inclusionsTable.areasUpdate(update)
    this.refs.addNewInclusionList.areasUpdate(update)
  }

  private showResetAreaConfirmation() {
    if (this.props.selectedArea) showResetAreaConfirmation(this.props.selectedArea, this.getPlayer())
  }

  private setAreaToInclude(area: BpArea | undefined) {
    this.areaToInclude = area

    let enabled: boolean
    let tooltip: LocalisedString
    if (area === undefined) {
      enabled = false
      tooltip = ""
    } else if (area === this.props.selectedArea) {
      enabled = false
      tooltip = "A blueprint area cannot include itself."
    } else {
      enabled = true
      tooltip = ""
    }
    for (const button of [this.refs.includeAtCenter, this.refs.placeInclusion]) {
      button.enabled = enabled
      button.tooltip = tooltip
    }
  }

  private addInclusionAtCenter() {
    const thisArea = this.props.selectedArea
    const sourceArea = this.areaToInclude
    if (!thisArea || !sourceArea) return
    thisArea.addInclusion(sourceArea)
  }

  private tryStartInclusionPlacement() {
    const thisArea = this.props.selectedArea
    const areaToAdd = this.areaToInclude
    if (!thisArea || !areaToAdd) return
    if (thisArea === areaToAdd) {
      return displayNotice(this.getPlayer(), "A blueprint area cannot include itself.")
    }
    startInclusionPlacement(this.getPlayer(), thisArea, areaToAdd)
  }
}
