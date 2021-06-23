import { DEV } from "./DEV"
import { onPlayerInit } from "./playerData"
import createElement, { create, FC } from "./gui"
import { dlog } from "./logging"
import { registerFunc } from "./funcRef"
import { registerHandler } from "./events"
import { destroyIfValid } from "./util"

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

let DevButtonsComponent: FC

function createDevButtons(player: LuaPlayer) {
  destroyDevButtons(player)
  create(player.gui.screen, <DevButtonsComponent />)
}

function destroyDevButtons(player: LuaPlayer): void {
  destroyIfValid(player.gui.screen.get("#devButtons"))
}

if (DEV) {
  const onClick = registerFunc((element: LuaGuiElement) => {
    const action = element.tags.action as string
    if (!devActions[action]) {
      dlog("Action", action, "does not exist, try refreshing")
      return
    }
    devActions[action](game.get_player(element.player_index))
  }, "devButtons:onClick")

  DevButtonsComponent = () => {
    return (
      <frame _direction={"vertical"} name={"#devButtons"} caption="BBPP dev buttons" location={{ x: 0, y: 1000 }}>
        {Object.keys(devActions).map((name) => (
          <button
            styleMod={{
              width: 200,
            }}
            onClick={onClick}
            tags={{ action: name }}
            caption={name}
          />
        ))}
      </frame>
    )
  }

  onPlayerInit((player) => {
    destroyDevButtons(player)
    create(player.gui.screen, <DevButtonsComponent />)
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
