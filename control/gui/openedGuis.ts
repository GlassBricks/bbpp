import { PlayerData } from "../../framework/playerData"

export interface OpenedGuis {
  layerNavigator?: LuaGuiElement
}

export const OpenedGuis = PlayerData<OpenedGuis>("openedGuis", () => ({}))
