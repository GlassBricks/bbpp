import { registerHandlers } from "../../framework/events"
import { PlayerArea } from "../playerAreaTracking"
import { BpArea, BpSurface } from "../BpArea"
import Reactorio, { AnySpec, NoUpdateComponent, registerComponent, Window } from "../../framework/gui"
import { CloseButton } from "../../framework/gui/components/buttons"
import { SurfacesTab } from "./SurfacesTab"
import { AreasTab } from "./AreasTab"
import { setupTabbedPane } from "../../framework/gui/tabbedPane"
import { CurrentAreaTab } from "./CurrentAreaTab"
import { PlayerDataChangedEvent } from "../../framework/playerData"

export interface BpGuiUpdate {
  surfaceCreated?: OnSurfaceCreatedPayload
  surfaceDeleted?: OnSurfaceDeletedPayload
  surfaceRenamed?: OnSurfaceRenamedPayload

  playerChangedSurface?: OnPlayerChangedSurfacePayload
  playerChangedArea?: PlayerDataChangedEvent<BpArea | undefined>

  areaCreated?: BpArea
  areaDeleted?: {
    id: number
    bpSurface: BpSurface
  }
}

export interface WithBpGuiUpdate {
  bpGuiUpdate(update: BpGuiUpdate): void
}

@registerComponent()
export class BpAreaEditorWindow extends NoUpdateComponent implements WithBpGuiUpdate {
  public static window = new Window(BpAreaEditorWindow)

  static updateAllPlayers(update: BpGuiUpdate): void {
    for (const [, component] of pairs(BpAreaEditorWindow.window.currentForAllPlayers())) {
      component.bpGuiUpdate(update)
    }
  }

  static updateFor(playerIndex: number, update: BpGuiUpdate): void {
    const component = BpAreaEditorWindow.window.currentOrNil(playerIndex)
    if (component) component.bpGuiUpdate(update)
  }

  bpGuiUpdate(update: BpGuiUpdate): void {
    for (const [, tab] of ipairs(this.refs)) {
      ;(tab as unknown as WithBpGuiUpdate).bpGuiUpdate(update)
    }
  }

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
          <CloseButton onClick={BpAreaEditorWindow.window.toggleRef} />
        </flow>
        <frame style="inside_deep_frame_for_tabs">
          <tabbed-pane
            onLateCreated={(el) => {
              setupTabbedPane(el)
              el.selected_tab_index = 2 // dev only!!!
            }}
            ref={"tabbedPane"}
          >
            <tab caption="Surfaces" />
            <SurfacesTab ref={1} />
            <tab caption="Areas" />
            <AreasTab ref={2} />
            <tab caption="Current area" />
            <CurrentAreaTab ref={3} />
          </tabbed-pane>
        </frame>
      </frame>
    )
  }
}

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

PlayerArea.subscribe((e) => {
  BpAreaEditorWindow.updateFor(e.player.index, { playerChangedArea: e })
})
