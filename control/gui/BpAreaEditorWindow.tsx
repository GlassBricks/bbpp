import { registerHandlers } from "../../framework/events"
import { PlayerArea, teleportPlayerToArea } from "../playerAreaTracking"
import { BpArea } from "../BpArea"
import Reactorio, { AnySpec, NoPropComponent, registerComponent, renderIn, Window } from "../../framework/gui"
import { SurfacesTab } from "./SurfacesTab"
import { setupTabbedPane } from "../../framework/gui/tabbedPane"
import { AreasTab } from "./AreasTab"
import { AreaControlsTab } from "./AreaControlsTab"
import { AreasUpdate, BpGuiTab, SelectedAreaProps, WithAreasUpdate } from "./BpGuiTab"

import { SimpleTitlebar } from "../../framework/gui/components/SimpleTitlebar"
import { onPlayerInit } from "../../framework/onPlayerInit"
import * as modGui from "mod-gui"
import { DEV } from "../../framework/DEV"

@registerComponent()
export class BpAreaEditorWindow extends NoPropComponent implements WithAreasUpdate {
  public static readonly window = new Window(BpAreaEditorWindow)

  public selectedArea: BpArea | undefined
  public syncAreaWithPlayer: boolean = true

  protected create(): AnySpec | undefined {
    this.selectedArea = PlayerArea.get(this.getPlayer())
    const initialTabProps: SelectedAreaProps = {
      selectedArea: this.selectedArea || false,
      setSelectedArea: this.r(this.setSelectedArea),

      syncAreaWithPlayer: this.syncAreaWithPlayer,
      setSyncAreaWithPlayer: this.r(this.setSyncAreaWithPlayer),
    }
    return (
      <frame
        direction="vertical"
        auto_center
        styleMod={{
          maximal_height: 1000,
          maximal_width: 500,
          vertically_stretchable: false,
        }}
      >
        <SimpleTitlebar title={"Blueprint area editor"} onClose={BpAreaEditorWindow.window.toggleRef} />
        <frame style="inside_deep_frame_for_tabs">
          <tabbed-pane
            onLateCreated={(el) => {
              setupTabbedPane(el)
              el.selected_tab_index = 3 // dev only!!!
            }}
            ref={"tabbedPane"}
          >
            <tab caption="Surfaces" />
            <SurfacesTab ref={1} {...initialTabProps} />
            <tab caption="Areas" />
            <AreasTab ref={2} {...initialTabProps} />
            <tab caption="Area controls" />
            <AreaControlsTab ref={3} {...initialTabProps} />
          </tabbed-pane>
        </frame>
      </frame>
    )
  }

  areasUpdate(update: AreasUpdate): void {
    for (const [, tab] of ipairs(this.refs)) {
      ;(tab as BpGuiTab).areasUpdate(update)
    }
    if (update.areaDeleted && this.selectedArea && this.selectedArea.id === update.areaDeleted.id) {
      this.setSelectedArea(undefined)
    }
    if (update.playerChangedArea && this.syncAreaWithPlayer) {
      this.setSelectedArea(update.playerChangedArea.newValue, true)
    }
  }

  private updateAll(props: Partial<SelectedAreaProps>) {
    for (const [, tab] of ipairs(this.refs)) {
      ;(tab as BpGuiTab).mergeProps(props)
    }
  }

  private setSelectedArea(area: BpArea | undefined, noTeleport?: boolean) {
    if (area !== this.selectedArea) {
      this.selectedArea = area
      this.updateAll({ selectedArea: area || false })
      if (area && !noTeleport && this.syncAreaWithPlayer) {
        teleportPlayerToArea(this.getPlayer(), area)
      }
    }
  }

  private setSyncAreaWithPlayer(sync: boolean) {
    if (this.syncAreaWithPlayer !== sync) {
      this.syncAreaWithPlayer = sync
      if (sync) {
        this.setSelectedArea(PlayerArea.get(this.getPlayer()))
      }
      this.updateAll({ syncAreaWithPlayer: sync })
    }
  }

  static updateAllPlayers(update: AreasUpdate): void {
    for (const [, component] of pairs(BpAreaEditorWindow.window.currentForAllPlayers())) {
      component.areasUpdate(update)
    }
  }

  static updateFor(playerIndex: number, update: AreasUpdate): void {
    const component = BpAreaEditorWindow.window.currentOrNil(playerIndex)
    if (component) component.areasUpdate(update)
  }
}

// todo: better eventing
registerHandlers({
  on_surface_created(e) {
    BpAreaEditorWindow.updateAllPlayers({ surfaceCreated: e })
  },
  on_surface_deleted(e) {
    BpAreaEditorWindow.updateAllPlayers({ surfaceDeleted: e })
  },
  on_surface_renamed(e) {
    BpAreaEditorWindow.updateAllPlayers({ surfaceRenamed: e })
  },
})
registerHandlers(
  {
    on_player_changed_surface(e) {
      BpAreaEditorWindow.updateFor(e.player_index, { playerChangedSurface: e })
    },
  },
  true
)
BpArea.onCreated.subscribeEarly((e) => {
  BpAreaEditorWindow.updateAllPlayers({ areaCreated: e })
})
BpArea.onDeleted.subscribeEarly((e) => {
  BpAreaEditorWindow.updateAllPlayers({ areaDeleted: e })
})
BpArea.onRenamed.subscribe((e) => {
  BpAreaEditorWindow.updateAllPlayers({ areaRenamed: e })
})
BpArea.onInclusionsModified.subscribe((e) => {
  BpAreaEditorWindow.updateAllPlayers({ inclusionsChanged: e })
})
BpArea.onOutdatedChanged.subscribe((e) => {
  BpAreaEditorWindow.updateAllPlayers({ outdatedChanged: e })
})
PlayerArea.subscribe((e) => {
  BpAreaEditorWindow.updateFor(e.player.index, { playerChangedArea: e })
})

onPlayerInit((player) => {
  const button = (
    <button
      name={"bbpp:dev window"}
      style={modGui.button_style}
      caption="BBPP"
      mouse_button_filter={["left"]}
      onClick={BpAreaEditorWindow.window.toggleRef}
    />
  )
  renderIn(modGui.get_button_flow(player), "bbpp:DevWindow", button)
  if (DEV) {
    BpAreaEditorWindow.window.toggle(player)
  }
})
