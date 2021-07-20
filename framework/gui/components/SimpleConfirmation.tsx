import Reactorio, { ComponentSpec, destroyIn, renderIn } from "../index"
import { ReactiveComponent, registerComponent } from "../component"
import { AnySpec } from "../spec"
import { callFuncRef, FuncRef } from "../../funcRef"

interface SimpleModalDialogueProps {
  title: LocalisedString
  text: LocalisedString
  /** text for back button */
  backText?: LocalisedString
  /** text for confirm button */
  confirmText?: LocalisedString
  /** If true, then is a red confirmation button, and the onConfirm control onBack instead of onConfirm. */
  redConfirm?: boolean
  onBack?: FuncRef<() => void>
  onConfirm?: FuncRef<() => void>
}

// unique name used in multiple contexts
const SimpleConfirmationId = "reactorio:SimpleConfirmation"

@registerComponent(SimpleConfirmationId)
export class SimpleConfirmation extends ReactiveComponent<SimpleModalDialogueProps> {
  static display(player: LuaPlayer, props: SimpleModalDialogueProps): void {
    renderIn(player.gui.screen, SimpleConfirmationId, {
      type: SimpleConfirmationId,
      props,
    } as ComponentSpec<SimpleModalDialogueProps>) // todo: jsx spread
  }

  onBack(): void {
    if (this.props.onBack) callFuncRef(this.props.onBack)
    destroyIn(this.parentGuiElement, SimpleConfirmationId)
  }

  onConfirm(): void {
    if (this.props.onConfirm) callFuncRef(this.props.onConfirm)
    destroyIn(this.parentGuiElement, SimpleConfirmationId)
  }

  protected create(): AnySpec | undefined {
    return (
      <frame
        auto_center
        caption={this.props.title}
        direction={"vertical"}
        styleMod={{
          maximal_height: 1000,
        }}
        onUpdate={(el) => {
          this.getPlayer().opened = el
          el.bring_to_front()
        }}
        onLateUpdate={(el) => {
          ;(this.refs.draggableSpace as EmptyWidgetGuiElement).drag_target = el
        }}
        onClosed={this.funcs.onBack}
        tags={{
          onConfirmFunc: this.props.redConfirm ? this.funcs.onBack : this.funcs.onConfirm,
        }}
      >
        <scroll-pane
          horizontal_scroll_policy={"never"}
          styleMod={{
            horizontally_stretchable: true,
          }}
        >
          <text-box caption={this.props.text} style={"notice_textbox"} read_only selectable={false} />
        </scroll-pane>
        <flow style={"dialog_buttons_horizontal_flow"}>
          {!!this.props.backText && (
            <flow>
              <button style={"back_button"} caption={this.props.backText} onClick={this.funcs.onBack} />
            </flow>
          )}
          {
            <empty-widget
              style={"draggable_space"}
              styleMod={{ horizontally_stretchable: true, vertically_stretchable: true }}
              onCreated={(el) => {
                el.drag_target = this.firstGuiElement
              }}
              ref={"draggableSpace"}
            />
          }
          {!!this.props.confirmText && (
            <flow>
              <button
                style={this.props.redConfirm ? "red_confirm_button" : "confirm_button"}
                caption={this.props.confirmText}
                onClick={this.funcs.onConfirm}
              />
            </flow>
          )}
        </flow>
      </frame>
    )
  }
}

export function displayNotice(player: LuaPlayer, message: LocalisedString): void {
  SimpleConfirmation.display(player, {
    title: "Notice",
    confirmText: "Confirm",
    text: message,
  })
}
