import { PlayerData } from "../../framework/playerData"

export interface OpenedGuis {
  layerNavigator?: GuiElement
}

export const OpenedGuis = PlayerData<OpenedGuis>("openedGuis", () => ({}))
