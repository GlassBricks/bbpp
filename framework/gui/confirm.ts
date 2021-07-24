import { registerHandlers } from "../events"
import { Prototypes } from "../../constants"
import { callGuiFunc, GuiFunc } from "./component"

export interface ConfirmTags {
  onConfirmFunc?: GuiFunc<() => void> | false
  playConfirmSound?: boolean
}

registerHandlers({
  [Prototypes.guiConfirmInput](e: CustomInputEvent) {
    const player = game.get_player(e.player_index)
    const opened = player.opened as LuaGuiElement | undefined
    if (!opened) return
    const tags = (player.opened as LuaGuiElement).tags as ConfirmTags | undefined
    if (!tags) return
    const func = tags.onConfirmFunc
    if (func) {
      if (tags.playConfirmSound)
        player.play_sound({
          path: "utility/confirm",
          override_sound_type: "gui-effect",
        })
      callGuiFunc(func)
    }
  },
})
