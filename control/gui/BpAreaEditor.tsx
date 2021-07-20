import { registerHandlers } from "../../framework/events"
import { PlayerArea } from "../playerAreaTracking"
import { PlayerDataChangedEvent } from "../../framework/playerData"
import { BpArea } from "../BpArea"
import Reactorio, { AnySpec, Component, registerComponent, Window } from "../../framework/gui"
import { CloseButton } from "../../framework/gui/components/buttons"
import { BpSurfacesTab } from "./BpSurfacesTab"
import { BpAreasTab } from "./BpAreasTab"
import { setupTabbedPane } from "../../framework/gui/tabbedPane"

export interface BpGuiUpdate {
  surfaceCreated?: OnSurfaceCreatedPayload
  surfaceDeleted?: OnSurfaceDeletedPayload
  surfaceRenamed?: OnSurfaceRenamedPayload

  playerChangedSurface?: OnPlayerChangedSurfacePayload
  playerChangedArea?: PlayerDataChangedEvent<BpArea | undefined>
}

@registerComponent()
export class BpAreaEditor extends Component<BpGuiUpdate> {
  public static window = new Window(BpAreaEditor)

  protected create(): AnySpec | undefined {
    return (
      <frame
        direction="vertical"
        auto_center
        styleMod={{
          minimal_width: 300,
          maximal_height: 1000,
          vertically_stretchable: false,
        }}
      >
        <flow // titlebar
          direction={"horizontal"}
          styleMod={{ horizontal_spacing: 8, height: 28 }}
          onCreated={(e) => {
            e.drag_target = e.parent
          }}
        >
          <label caption="Blueprint area editor" style="frame_title" ignored_by_interaction />
          <empty-widget style="flib_titlebar_drag_handle" ignored_by_interaction />
          <CloseButton onClick={BpAreaEditor.window.toggleRef} />
        </flow>
        <frame style="inside_deep_frame_for_tabs">
          <tabbed-pane onLateCreated={setupTabbedPane} ref={"tabbedPane"}>
            <tab caption="Surfaces" />
            <BpSurfacesTab ref={1} />
            <tab caption="Areas" />
            <BpAreasTab ref={2} />
          </tabbed-pane>
        </frame>
      </frame>
    )
  }

  protected update(_: unknown, firstUpdate: boolean): void {
    if (firstUpdate) return
    for (const [, tab] of ipairs(this.refs)) {
      ;(tab as Component<BpGuiUpdate>).updateWith(this.props)
    }
  }
}

registerHandlers({
  on_surface_created(e) {
    BpAreaEditor.window.updateAll({ surfaceCreated: e })
  },
  on_surface_deleted(e) {
    BpAreaEditor.window.updateAll({ surfaceDeleted: e })
  },
  on_surface_renamed(e) {
    BpAreaEditor.window.updateAll({ surfaceRenamed: e })
  },
  on_player_changed_surface(e) {
    BpAreaEditor.window.update(game.get_player(e.player_index), {
      playerChangedSurface: e,
    })
  },
})
PlayerArea.addObserver((e) => {
  BpAreaEditor.window.update(e.player, {
    playerChangedArea: e,
  })
})
