import { DEBUG } from "./debug"
import { onPlayerCreated } from "./playerData"
import { GuiComponent } from "./gui"
import { registerHandler } from "./events"
import { dlog } from "./logging"
import { destroyIfValid } from "./util"

const devActions: Record<string, (player: LuaPlayer) => void> = {}

export function addDevButton(
  name: string,
  action: (player: LuaPlayer) => void
): void {
  if (!DEBUG) return
  assert(!devActions[name])
  devActions[name] = action
}

let DevButtonsFrame: GuiComponent<undefined>

function createDevButtons(player: LuaPlayer) {
  destroyDevButtons(player)
  DevButtonsFrame.create(player.gui.screen, "__devButtons", undefined)
}

function destroyDevButtons(player: LuaPlayer): void {
  destroyIfValid(player.gui.screen.__devButtons)
}

if (DEBUG) {
  const DevButton = GuiComponent("__devButton", {
    type: "button",
    onCreated() {
      this.caption = this.name
      this.style.width = 200
    },
    onAction() {
      if (!devActions[this.name]) {
        dlog("Action", this.name, "does not exist, try refreshing")
      }
      devActions[this.name](game.get_player(this.player_index))
    },
  })
  DevButtonsFrame = GuiComponent("__devButtonsFrame", {
    type: "frame",
    direction: "vertical",
    caption: "BBPP dev buttons",
    onCreated() {
      for (const name in devActions) {
        // noinspection JSUnfilteredForInLoop
        DevButton.create(this, name, undefined)
      }
    },
  })

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
