import { registerHandlers } from "../events"
import { Prototypes } from "../../constants"
import { FuncRef } from "../funcRef"
import { callGuiFunc } from "./component"

export interface Tags {
  onConfirmFunc?: FuncRef<() => void> | false
}

registerHandlers({
  [Prototypes.guiConfirmInput](e: CustomInputEvent) {
    const player = game.get_player(e.player_index)
    const opened = player.opened as LuaGuiElement | undefined
    if (!opened) return
    const tags = (player.opened as LuaGuiElement).tags as Tags | undefined
    if (!tags) return
    const func = tags.onConfirmFunc
    if (func) {
      player.play_sound({
        path: "utility/confirm",
        override_sound_type: "gui-effect",
      })
      callGuiFunc(func)
    }
  },
})
