import Reactorio, { AnySpec, callGuiFunc, ManualReactiveComponent, registerComponent } from "../../framework/gui"
import { Subcomponent } from "../../framework/gui/Subcomponent"
import { AreasList } from "./AreasList"
import { dlog } from "../../framework/logging"
import { BpArea } from "../BpArea"
import { teleportPlayerToArea } from "../playerAreaTracking"
import { AreasUpdate, SelectedAreaProps, WithAreasUpdate } from "./BpGuiTab"
import { GuiConstants } from "../../constants"

@registerComponent()
export class AreaSelector extends ManualReactiveComponent<SelectedAreaProps> implements WithAreasUpdate {
  declare refs: {
    listOrName: Subcomponent
    areaList: AreasList | undefined
    sync: CheckboxGuiElement
    rename: ButtonGuiElement
    teleport: ButtonGuiElement
  }

  private renamingArea: BpArea | undefined

  protected create(): AnySpec | undefined {
    return (
      <flow direction="vertical" styleMod={{ horizontally_stretchable: true }}>
        <label style={"caption_label"} caption={"Current area"} />
        <table column_count={2}>
          <Subcomponent ref={"listOrName"} reref={this} />
          <button ref={"rename"} caption={"rename"} onClick={this.r(this.toggleRename)} />
          <checkbox
            ref="sync"
            state={true}
            caption={"Sync selected area with player"}
            onCheckedStateChanged={this.r(this.setSync)}
          />
          <button
            ref={"teleport"}
            caption={"Teleport"}
            enabled={this.props.selectedArea && !this.props.syncAreaWithPlayer}
            onClick={this.r(this.teleportPlayer)}
          />
        </table>
      </flow>
    )
  }

  onCreated(): void {
    this.propsChanged(this.props)
    this.resetRename()
  }

  protected propsChanged(change: Partial<SelectedAreaProps>): void {
    if (change.selectedArea !== undefined) {
      const areaList = this.refs.areaList
      if (areaList) {
        areaList.mergeProps(change)
      }
      this.refs.rename.enabled = change.selectedArea !== false
      this.refs.teleport.enabled = this.props.selectedArea && !this.props.syncAreaWithPlayer
    }
    if (change.syncAreaWithPlayer !== undefined) {
      this.refs.sync.state = change.syncAreaWithPlayer
      this.refs.teleport.enabled = this.props.selectedArea && !this.props.syncAreaWithPlayer
    }
  }

  areasUpdate(update: AreasUpdate): void {
    this.refs.areaList?.areasUpdate(update)
    if (update.areaDeleted && this.renamingArea && update.areaDeleted.id === this.renamingArea.id) {
      this.resetRename()
    }
  }

  private resetRename() {
    this.renamingArea = undefined
    this.refs.listOrName.applySpec(
      <AreasList
        ref={"areaList"}
        kind={"drop-down"}
        selectedArea={this.props.selectedArea}
        onSelectedAreaChanged={this.props.setSelectedArea}
      />
    )
    this.refs.rename.caption = "Rename"
  }

  private setSync(el: CheckboxGuiElement): void {
    callGuiFunc(this.props.setSyncAreaWithPlayer, el.state)
  }

  private toggleRename() {
    if (!this.renamingArea) {
      this.startRename()
    } else {
      this.resetRename()
    }
  }

  private startRename() {
    if (!this.props.selectedArea) return
    this.renamingArea = this.props.selectedArea
    this.refs.listOrName.applySpec(
      <textfield
        text={this.renamingArea.name}
        styleMod={{
          width: GuiConstants.areaListWidth,
        }}
        onConfirmed={this.r(this.doRename)}
      />
    )
    this.refs.rename.caption = "Cancel"
  }

  private doRename() {
    const newName = (this.refs.listOrName.firstGuiElement as TextfieldGuiElement).text
    if (!this.renamingArea || !this.renamingArea.valid) {
      dlog("skipped rename area")
    } else {
      this.renamingArea.name = newName
      BpArea.onRenamed.raise(this.renamingArea)
    }
    this.resetRename()
  }

  private teleportPlayer(): void {
    if (this.props.selectedArea) teleportPlayerToArea(this.getPlayer(), this.props.selectedArea)
  }
}
