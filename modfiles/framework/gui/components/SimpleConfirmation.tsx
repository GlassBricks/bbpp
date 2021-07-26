import Reactorio, { callGuiFunc, ComponentSpec, destroyIn, renderIn } from "../index"
import { ReactiveComponent, registerComponent } from "../component"
import { AnySpec } from "../spec"
import { FuncRef } from "../../funcRef"
import { ConfirmTags } from "../confirm"

interface SimpleModalDialogueProps<T> {
  title: LocalisedString
  text: LocalisedString
  /** text for back button */
  backText?: LocalisedString
  /** text for confirm button */
  confirmText?: LocalisedString
  /** If true, then is a red confirmation button, and the onConfirm control onBack instead of onConfirm. */
  redConfirm?: boolean
  onBack?: FuncRef<(data: T) => void>
  onConfirm?: FuncRef<(data: T) => void>
  data?: T
}

// unique name used in multiple contexts
const SimpleConfirmationId = "reactorio:SimpleConfirmation"

@registerComponent(SimpleConfirmationId)
export class SimpleConfirmation extends ReactiveComponent<SimpleModalDialogueProps<unknown>> {
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
        onClosed={this.r(this.onBack)}
        tags={
          {
            onConfirmFunc: this.props.redConfirm ? this.r(this.onBack) : this.r(this.onConfirm),
            playConfirmSound: !this.props.redConfirm,
          } as ConfirmTags
        }
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
              <button style={"back_button"} caption={this.props.backText} onClick={this.r(this.onBack)} />
            </flow>
          )}
          <empty-widget
            style={"draggable_space"}
            styleMod={{ horizontally_stretchable: true, vertically_stretchable: true }}
            onCreated={(el) => {
              el.drag_target = el.parent.parent
            }}
          />
          {!!this.props.confirmText && (
            <flow>
              <button
                style={this.props.redConfirm ? "red_confirm_button" : "confirm_button"}
                caption={this.props.confirmText}
                onClick={this.r(this.onConfirm)}
              />
            </flow>
          )}
        </flow>
      </frame>
    )
  }

  static display<T>(player: LuaPlayer, props: SimpleModalDialogueProps<T>): void {
    renderIn(player.gui.screen, SimpleConfirmationId, {
      type: SimpleConfirmationId,
      props,
    } as ComponentSpec<SimpleModalDialogueProps<T>>)
  }

  onBack(): void {
    if (this.props.onBack) callGuiFunc(this.props.onBack, this.props.data)
    destroyIn(this.parentGuiElement, SimpleConfirmationId)
  }

  onConfirm(): void {
    if (this.props.onConfirm) callGuiFunc(this.props.onConfirm, this.props.data)
    destroyIn(this.parentGuiElement, SimpleConfirmationId)
  }
}

export function displayNotice(player: LuaPlayer, message: LocalisedString): void {
  SimpleConfirmation.display(player, {
    title: "Notice",
    confirmText: "Confirm",
    text: message,
  })
}
