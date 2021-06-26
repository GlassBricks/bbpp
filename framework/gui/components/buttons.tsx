import createElement, { AnySpec, Component, ComponentFunc, registerComponent } from ".."

interface CloseButtonProps {
  onClick: ComponentFunc<(element: SpriteButtonGuiElement, payload: OnGuiClickPayload) => void>
}

@registerComponent
export class CloseButton extends Component<CloseButtonProps> {
  update(): AnySpec | undefined {
    return (
      <sprite-button
        style={"frame_action_button"}
        sprite={"utility/close_white"}
        hovered_sprite={"utility/close_black"}
        clicked_sprite={"utility.close_black"}
        mouse_button_filter={["left"]}
        onClick={this.props.onClick}
      />
    )
  }
}
