type Direction = "horizontal" | "vertical"

type BaseGuiElementSpec = {
  type: string
  name?: string
  caption?: LocalisedString
  tooltip?: LocalisedString
  enabled?: boolean
  visible?: boolean
  ignored_by_interaction?: boolean
  style?: string
  tags?: Tags
  index?: number
  anchor?: GuiAnchor
}

type ButtonGuiElementSpec = BaseGuiElementSpec & {
  type: "button"
  mouse_button_filter?: MouseButtonFlags
}

type FlowGuiElementSpec = BaseGuiElementSpec & {
  type: "flow"
  direction?: Direction
}

type FrameGuiElementSpec = BaseGuiElementSpec & {
  type: "frame"
  direction?: Direction
}

type TableGuiElementSpec = BaseGuiElementSpec & {
  type: "table"
  column_count: number
  draw_vertical_lines?: boolean
  draw_horizontal_lines?: boolean
  draw_horizontal_line_after_headers?: boolean
  vertical_centering?: boolean
}

type TextfieldGuiElementSpec = BaseGuiElementSpec & {
  type: "textfield"
  text?: string
  numeric?: boolean
  allow_decimal?: boolean
  allow_negative?: boolean
  is_password?: boolean
  lose_focus_on_confirm?: boolean
  clear_and_focus_on_right_click?: boolean
}

type ProgressbarGuiElementSpec = BaseGuiElementSpec & {
  type: "progressbar"
  value?: number
}

type CheckboxGuiElementSpec = BaseGuiElementSpec & {
  type: "checkbox"
  state: boolean
}

type RadiobuttonGuiElementSpec = BaseGuiElementSpec & {
  type: "radiobutton"
  state: boolean
}

type SpriteButtonGuiElementSpec = BaseGuiElementSpec & {
  type: "sprite-button"
  sprite?: SpritePath
  hovered_sprite?: SpritePath
  clicked_sprite?: SpritePath
  number?: number
  show_percent_for_small_numbers?: boolean
  mouse_button_filter?: MouseButtonFlags
}

type SpriteGuiElementSpec = BaseGuiElementSpec & {
  type: "sprite"
  sprite?: SpritePath
  resize_to_sprite?: boolean
}

type ScrollPolicy =
  | "auto"
  | "never"
  | "always"
  | "auto-and-reserve-space"
  | "dont-show-but-allow-scrolling"
type ScrollPaneGuiElementSpec = BaseGuiElementSpec & {
  type: "scroll-pane"
  horizontal_scroll_policy?: ScrollPolicy
  vertical_scroll_policy?: ScrollPolicy
}

type DropDownGuiElementSpec = BaseGuiElementSpec & {
  type: "drop-down"
  items?: [LocalisedString]
  selected_index?: number
}

type LineGuiElementSpec = BaseGuiElementSpec & {
  type: "line"
  direction: Direction
}

type CameraGuiElementSpec = BaseGuiElementSpec & {
  type: "camera"
  position: Position
  surface_index?: number
  zoom?: number
}

interface ChooseElemButtonTypes {
  item: string
  tile: string
  entity: string
  signal: string
  signalId: SignalID
  fluid: string
  recipe: string
  decorative: string
  "item-group": string
  achievement: string
  equipment: string
  technology: string
}

type ChooseElemButtonGuiElementSpec<T extends keyof ChooseElemButtonTypes> =
  BaseGuiElementSpec & {
    type: "choose-elem-button"
    elem_type: T
  } & {
      [e in T]?: ChooseElemButtonTypes[T]
    }

type TextBoxGuiElementSpec = BaseGuiElementSpec & {
  type: "text-box"
  text?: string
  clear_and_focus_on_right_click?: boolean
}

type SliderGuiElementSpec = BaseGuiElementSpec & {
  type: "slider"
  minimum_value?: number
  maximum_value?: number
  value?: number
  value_step?: number
  discrete_slider?: boolean
  discrete_values?: boolean
}

type MinimapGuiElementSpec = BaseGuiElementSpec & {
  type: "minimap"
  position?: Position
  surface_index?: number
  chart_player_index?: number
  force?: string
  zoom?: number
}

type TabGuiElementSpec = BaseGuiElementSpec & {
  type: "tab"
  badge_text?: LocalisedString
}

type SwitchGuiElementSpec = BaseGuiElementSpec & {
  type: "switch"
  switch_state?: "left" | "right" | "none"
  allow_none_state?: boolean
  left_label_caption?: LocalisedString
  left_label_tooltip?: LocalisedString
  right_label_caption?: LocalisedString
  right_label_tooltip?: LocalisedString
}

/** @noSelf */
type GuiElementSpec =
  | ButtonGuiElementSpec
  | FlowGuiElementSpec
  | FrameGuiElementSpec
  | TableGuiElementSpec
  | TextfieldGuiElementSpec
  | ProgressbarGuiElementSpec
  | CheckboxGuiElementSpec
  | RadiobuttonGuiElementSpec
  | SpriteButtonGuiElementSpec
  | SpriteGuiElementSpec
  | ScrollPaneGuiElementSpec
  | DropDownGuiElementSpec
  | LineGuiElementSpec
  | CameraGuiElementSpec
  | ChooseElemButtonGuiElementSpec<any>
  | TextBoxGuiElementSpec
  | SliderGuiElementSpec
  | MinimapGuiElementSpec
  | TabGuiElementSpec
  | SwitchGuiElementSpec

type GuiElementType = GuiElementSpec["type"]
