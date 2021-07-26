import { GuiFunc } from "../component"
import { CloseButton } from "./buttons"
import Reactorio, { AnySpec } from "../index"

export function SimpleTitlebar(props: {
  title: LocalisedString
  onClose?: GuiFunc<(element: SpriteButtonGuiElement, event: OnGuiClickPayload) => void>
}): AnySpec {
  return (
    <flow
      direction={"horizontal"}
      styleMod={{ horizontal_spacing: 8, height: 28 }}
      onCreated={(e) => {
        e.drag_target = e.parent
      }}
    >
      <label caption={props.title} style="frame_title" ignored_by_interaction />
      <empty-widget style="flib_titlebar_drag_handle" ignored_by_interaction />
      {props.onClose !== undefined && <CloseButton onClick={props.onClose} />}
    </flow>
  )
}
