import { DEBUG } from "./debug"
import { onPlayerCreated } from "./playerData"
import { registerHandler } from "./events"
import { destroyIfValid } from "./util"
import { create, guiFuncs, GuiTemplate } from "./gui"
import { dlog } from "./logging"

const devActions: Record<string, (player: LuaPlayer) => void> = {}

export function DevButton(
  name: string,
  action: (player: LuaPlayer) => void
): void {
  if (!DEBUG) return
  assert(!devActions[name])
  devActions[name] = action
}

let DevButtonsFrame: GuiTemplate

function createDevButtons(player: LuaPlayer) {
  destroyDevButtons(player)
  create(player.gui.screen, DevButtonsFrame)
}

function destroyDevButtons(player: LuaPlayer): void {
  destroyIfValid(player.gui.screen["#devButtons"])
}

if (DEBUG) {
  const functions = guiFuncs("#devButtons", {
    onAction(this: GuiElement) {
      if (!devActions[this.name]) {
        dlog("Action", this.name, "does not exist, try refreshing")
      }
      devActions[this.name](game.get_player(this.player_index))
    },
  })
  const ADevButton: GuiTemplate<string> = {
    type: "button",
    elementMod: {
      name: (n) => n,
      caption: (n) => n,
    },
    styleMod: {
      width: 200,
    },
    onAction: functions.onAction,
  }
  DevButtonsFrame = {
    type: "frame",
    name: "#devButtons",
    direction: "vertical",
    caption: "BBPP dev buttons",
    onCreated() {
      for (const name in devActions) {
        create(this, ADevButton, name)
      }
    },
  }

  onPlayerCreated((player) => {
    createDevButtons(player)
  })
}

registerHandler("on_configuration_changed", () => {
  if (DEBUG) {
    for (const [, player] of pairs(game.players)) {
      createDevButtons(player)
    }
  } else {
    for (const [, player] of pairs(game.players)) {
      destroyDevButtons(player)
    }
  }
})
