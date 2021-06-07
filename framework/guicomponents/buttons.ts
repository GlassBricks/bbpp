import { GuiTemplate } from "../gui"

export const CloseButton: GuiTemplate = {
  type: "sprite-button",
  // onClick,
  sprite: "utility/close_white",
  hovered_sprite: "utility/close_black",
  clicked_sprite: "utility/close_black",
  style: "frame_action_button",
  mouse_button_filter: ["left"],
}
