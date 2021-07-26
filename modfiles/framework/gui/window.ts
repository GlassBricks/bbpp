import { Component } from "./component"
import { PlayerData } from "../playerData"
import { destroyIn, renderIn } from "./render"
import { ComponentSpec } from "./spec"
import { FuncRef, registerFunc } from "../funcRef"

export class Window<C extends Component<{}>> {
  private readonly currentComponent: PlayerData<C | undefined>
  private readonly spec: ComponentSpec<C["props"]>

  readonly toggleRef: FuncRef<(e: { player_index: number }) => void>

  constructor(public readonly componentClass: Class<C>, public readonly name: string = componentClass.name) {
    this.currentComponent = PlayerData("window " + name, () => undefined)
    this.spec = {
      type: componentClass.name,
      props: {},
      ref: "component",
    }

    this.toggleRef = registerFunc((e) => {
      this.toggle(game.get_player(e.player_index), {})
    }, `window ${name}:toggleRef`)
  }

  render(player: LuaPlayer, props?: C["props"]): C {
    this.spec.props = props || {}
    const component = renderIn(player.gui.screen, this.name, this.spec).component as C
    this.currentComponent.data[player.index] = component
    return component
  }

  destroy(player: LuaPlayer): boolean {
    this.currentComponent.data[player.index] = undefined
    return destroyIn(player.gui.screen, this.name)
  }

  toggle(player: LuaPlayer, props?: C["props"]): C | undefined {
    if (this.destroy(player)) {
      return undefined
    }
    return this.render(player, props)
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  currentOrNil(playerIndex: number): C | undefined {
    return this.currentComponent.data[playerIndex]
  }

  currentForAllPlayers(): Readonly<PRecord<number, C>> {
    return this.currentComponent.data
  }

  rerenderIfPresent(player: LuaPlayer): void {
    const current = this.currentOrNil(player.index)
    if (current) {
      const props = current.props
      this.destroy(player)
      this.render(player, props)
    }
  }
}
