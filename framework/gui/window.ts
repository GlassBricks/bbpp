import { Component, PropsOf } from "./component"
import { PlayerData } from "../playerData"
import { destroyIn, renderIn } from "./render"
import { ComponentSpec } from "./spec"
import { FuncRef, registerFunc } from "../funcRef"

export class Window<C extends Component<{}>> {
  private readonly currentComponent: PlayerData<C | undefined>
  private readonly spec: ComponentSpec<PropsOf<C>>

  readonly toggleRef: FuncRef<(e: { player_index: number }) => void>

  render(player: LuaPlayer, props?: PropsOf<C>): C {
    this.spec.props = props || {}
    const component = renderIn(player.gui.screen, this.name, this.spec).component as C
    this.currentComponent.data[player.index] = component
    return component
  }

  destroy(player: LuaPlayer): boolean {
    this.currentComponent.data[player.index] = undefined
    return destroyIn(player.gui.screen, this.name)
  }

  toggle(player: LuaPlayer): C | undefined {
    if (this.destroy(player)) {
      return undefined
    }
    return this.render(player)
  }

  constructor(public readonly componentClass: Class<C>, public readonly name = componentClass.name) {
    this.currentComponent = PlayerData("window " + name, () => undefined)
    this.spec = {
      type: componentClass.name,
      props: {} as PropsOf<C>,
      ref: "component",
    }

    this.toggleRef = registerFunc((e) => {
      this.toggle(game.get_player(e.player_index))
    }, `window ${name}:toggleRef`)
  }

  currentOrNil(playerIndex: number): C | undefined {
    return this.currentComponent.data[playerIndex]
  }

  update(player: LuaPlayer, props?: PropsOf<C>): C | undefined {
    const current = this.currentComponent.data[player.index]
    if (current) current.updateWith(props || {})
    return current
  }

  updateAll(props?: PropsOf<C>): void {
    for (const [, component] of pairs(this.currentComponent.data)) {
      component.updateMerge(props || {})
    }
  }

  rerenderIfPresent(player: LuaPlayer): void {
    if (this.destroy(player)) this.render(player)
  }
}
