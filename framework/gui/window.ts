import { Component, PropsOf } from "./component"
import { PlayerData } from "../playerData"
import { destroyIn, renderIn } from "./render"
import { ComponentSpec } from "./spec"

export class Window<C extends Component<{}>> {
  private readonly currentComponent: PlayerData<C | undefined>

  private readonly spec: ComponentSpec<PropsOf<C>>

  constructor(public readonly componentClass: Class<C>, public readonly name = componentClass.name) {
    this.currentComponent = PlayerData("window " + name, () => undefined)
    this.spec = {
      type: componentClass.name,
      props: {} as PropsOf<C>,
      ref: "component",
    }
  }

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

  currentOrNil(playerIndex: number): C | undefined {
    return this.currentComponent.data[playerIndex]
  }

  updateIfPresent(playerIndex: number, props?: PropsOf<C>): C | undefined {
    const current = this.currentComponent.data[playerIndex]
    if (current) current.updateWith(props || {})
    return current
  }

  rerenderIfPresent(player: LuaPlayer): void {
    if (this.destroy(player)) this.render(player)
  }
}
