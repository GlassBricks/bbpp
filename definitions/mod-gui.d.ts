/** @noResolution */
declare module "mod-gui" {
  export function get_button_flow(player: LuaPlayer): FlowGuiElement

  export const button_style: LuaStyle

  export function get_frame_flow(player: LuaPlayer): FlowGuiElement

  export const frame_style: LuaStyle
}
