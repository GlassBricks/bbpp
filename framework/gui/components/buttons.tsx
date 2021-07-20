import Reactorio, { AnySpec, ReactiveComponent, registerComponent } from ".."
import { FuncRef } from "../../funcRef"

interface CloseButtonProps {
  onClick: FuncRef<(element: SpriteButtonGuiElement, payload: OnGuiClickPayload) => void>
}

@registerComponent()
export class CloseButton extends ReactiveComponent<CloseButtonProps> {
  create(): AnySpec {
    return (
      <sprite-button
        style={"frame_action_button"}
        sprite={"utility/close_white"}
        hovered_sprite={"utility/close_black"}
        clicked_sprite={"utility.close_black"}
        tooltip={"Close"}
        mouse_button_filter={["left"]}
        onClick={this.props.onClick}
      />
    )
  }
}
