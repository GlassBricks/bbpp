import { PlayerDataChangedEvent } from "../../framework/playerData"
import { BpArea, BpSurface } from "../BpArea"
import { GuiFunc, ManualReactiveComponent } from "../../framework/gui"

export interface SelectedAreaProps {
  selectedArea: BpArea | false
  setSelectedArea: GuiFunc<(area: BpArea | undefined) => void>

  syncAreaWithPlayer: boolean
  setSyncAreaWithPlayer: GuiFunc<(area: boolean) => void>
}

// TODO: regret making reactive framework and switch to observable properties
export interface AreasUpdate {
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
  areaRenamed?: BpArea

  inclusionsChanged?: { area: BpArea }
  outdatedChanged?: BpArea
}

export interface WithAreasUpdate {
  areasUpdate(update: AreasUpdate): void
}

export abstract class BpGuiTab<Props extends SelectedAreaProps = SelectedAreaProps>
  extends ManualReactiveComponent<Props>
  implements WithAreasUpdate
{
  abstract areasUpdate(update: AreasUpdate): void
}
