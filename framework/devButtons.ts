import { DEV } from "./DEV"
import { onPlayerInit } from "./playerData"
import { registerHandler } from "./events"
import { destroyIfValid } from "./util"
import { create, GuiTemplate } from "./gui"
import { dlog } from "./logging"
import { funcRefs } from "./funcRef"

const devActions: Record<string, (player: LuaPlayer) => void> = {}

export function DevButton(name: string, action: (player: LuaPlayer) => void): void {
  if (!DEV) return
  assert(!devActions[name])
  devActions[name] = action
}

export function DevButtons(actions: Record<string, (player: LuaPlayer) => void>): void {
  if (!DEV) return
  for (const [name, action] of pairs(actions)) {
    DevButton(name, action)
  }
}

let DevButtonsFrame: GuiTemplate

function createDevButtons(player: LuaPlayer) {
  destroyDevButtons(player)
  create(player.gui.screen, DevButtonsFrame)
}

function destroyDevButtons(player: LuaPlayer): void {
  destroyIfValid(player.gui.screen["#devButtons"])
}

if (DEV) {
  const functions = funcRefs({
    devButtonOnClick(element: GuiElement) {
      if (!devActions[element.name]) {
        dlog("Action", element.name, "does not exist, try refreshing")
        return
      }
      devActions[element.name](game.get_player(element.player_index))
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
    onClick: functions.devButtonOnClick,
  }
  DevButtonsFrame = {
    type: "frame",
    name: "#devButtons",
    direction: "vertical",
    caption: "BBPP dev buttons",
    elementMod: {
      location: { x: 0, y: 1000 },
    },
    onPreCreated(element) {
      for (const name in devActions) {
        create(element, ADevButton, name)
      }
    },
  }

  onPlayerInit((player) => {
    createDevButtons(player)
  })
}

registerHandler("on_configuration_changed", () => {
  if (DEV) {
    for (const [, player] of pairs(game.players)) {
      createDevButtons(player)
    }
  } else {
    for (const [, player] of pairs(game.players)) {
      destroyDevButtons(player)
    }
  }
})
