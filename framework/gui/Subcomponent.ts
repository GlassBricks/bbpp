import { Component, ReactiveComponent, registerComponent } from "./component"
import { AnySpec } from "./spec"

@registerComponent("reactorio:Subcomponent")
export class Subcomponent extends ReactiveComponent<{
  children?: AnySpec
  reref?: Component<any>
}> {
  declare applySpec: Component<any>["applySpec"]

  protected create(): AnySpec | undefined {
    if (this.props.reref) {
      this.refs = this.props.reref.refs
    }

    return this.props.children as AnySpec | undefined
  }
}
