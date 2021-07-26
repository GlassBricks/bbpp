import Reactorio, { AnySpec, registerComponent } from "../../framework/gui"
import { AreaSelector } from "./AreaSelector"
import { AreasUpdate, BpGuiTab, SelectedAreaProps } from "./BpGuiTab"

// todo: better refs
@registerComponent()
export class BlueprintTab extends BpGuiTab {
  declare refs: {
    areaSelector: AreaSelector
  }

  protected create(): AnySpec | undefined {
    return (
      <table style={"bordered_table"} column_count={1}>
        <AreaSelector ref={"areaSelector"} {...this.props} />
        <flow direction="vertical" styleMod={{ horizontally_stretchable: true }}>
          <label style={"caption_label"} caption={"Blueprint for current area"} />
          <button ref={1} caption={"Get copy of blueprint"} onClick={this.r(this.giveBp)} />
          <button ref={2} caption={"Open blueprint/edit blueprint details"} onClick={this.r(this.openBp)} />
        </flow>
      </table>
    )
  }

  protected propsChanged(change: Partial<SelectedAreaProps>): void {
    this.refs.areaSelector.mergeProps(change)
    if (change.selectedArea !== undefined) {
      const enabled = change.selectedArea !== false
      for (const [, button] of ipairs(this.refs)) {
        ;(button as ButtonGuiElement).enabled = enabled
      }
    }
  }

  areasUpdate(update: AreasUpdate): void {
    this.refs.areaSelector.areasUpdate(update)
  }

  private openBp(): void {
    if (!this.props.selectedArea) return
    this.props.selectedArea.openUserBp(this.getPlayer())
  }

  private giveBp(): void {
    if (!this.props.selectedArea) return
    this.props.selectedArea.giveUserBlueprint(this.getPlayer())
  }
}
