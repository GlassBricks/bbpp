import createElement from ".."
import { FC } from "../spec"

export const CloseButton: FC<{
  onClick: (element: SpriteButtonGuiElement, payload: OnGuiClickPayload) => void
}> = ({ onClick }) => (
  <sprite-button
    created_style={"frame_action_button"}
    sprite={"utility/close_white"}
    hovered_sprite={"utility/close_black"}
    clicked_sprite={"utility.close_black"}
    mouse_button_filter={["left"]}
    onClick={onClick}
  />
)
