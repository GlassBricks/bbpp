/** @noSelfInFile */

/** @noSelf */
interface BaseGuiSpec {
  readonly type: GuiElementType
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

/** @noSelf */
type ButtonGuiSpec = BaseGuiSpec & {
  type: "button"
  mouse_button_filter?: MouseButtonFlags
}

/** @noSelf */
type FlowGuiSpec = BaseGuiSpec & {
  type: "flow"
  direction?: Direction
}

/** @noSelf */
type FrameGuiSpec = BaseGuiSpec & {
  type: "frame"
  direction?: Direction
}

/** @noSelf */
type TableGuiSpec = BaseGuiSpec & {
  type: "table"
  column_count: number
  draw_vertical_lines?: boolean
  draw_horizontal_lines?: boolean
  draw_horizontal_line_after_headers?: boolean
  vertical_centering?: boolean
}

/** @noSelf */
type TextfieldGuiSpec = BaseGuiSpec & {
  type: "textfield"
  text?: string
  numeric?: boolean
  allow_decimal?: boolean
  allow_negative?: boolean
  is_password?: boolean
  lose_focus_on_confirm?: boolean
  clear_and_focus_on_right_click?: boolean
}

/** @noSelf */
type ProgressbarGuiSpec = BaseGuiSpec & {
  type: "progressbar"
  value?: number
}

/** @noSelf */
type CheckboxGuiSpec = BaseGuiSpec & {
  type: "checkbox"
  state: boolean
}

/** @noSelf */
type RadiobuttonGuiSpec = BaseGuiSpec & {
  type: "radiobutton"
  state: boolean
}

/** @noSelf */
type SpriteButtonGuiSpec = BaseGuiSpec & {
  type: "sprite-button"
  sprite?: SpritePath
  hovered_sprite?: SpritePath
  clicked_sprite?: SpritePath
  number?: number
  show_percent_for_small_numbers?: boolean
  mouse_button_filter?: MouseButtonFlags
}

/** @noSelf */
type SpriteGuiSpec = BaseGuiSpec & {
  type: "sprite"
  sprite?: SpritePath
  resize_to_sprite?: boolean
}

/** @noSelf */
type ScrollPaneGuiSpec = BaseGuiSpec & {
  type: "scroll-pane"
  horizontal_scroll_policy?: ScrollPolicy
  vertical_scroll_policy?: ScrollPolicy
}

/** @noSelf */
type DropDownGuiSpec = BaseGuiSpec & {
  type: "drop-down"
  items?: [LocalisedString]
  selected_index?: number
}

/** @noSelf */
type LineGuiSpec = BaseGuiSpec & {
  type: "line"
  direction: Direction
}

/** @noSelf */
type ListBoxGuiSpec = BaseGuiSpec & {
  type: "list-box"
  items?: LocalisedString[]
  selected_index?: number
}

/** @noSelf */
type CameraGuiSpec = BaseGuiSpec & {
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

/** @noSelf */
type ChooseElemButtonGuiSpec<T extends keyof ChooseElemButtonTypes> =
  BaseGuiSpec & {
  type: "choose-elem-button"
  elem_type: T
} & {
  [e in T]?: ChooseElemButtonTypes[T]
}

/** @noSelf */
type TextBoxGuiSpec = BaseGuiSpec & {
  type: "text-box"
  text?: string
  clear_and_focus_on_right_click?: boolean
}

/** @noSelf */
type SliderGuiSpec = BaseGuiSpec & {
  type: "slider"
  minimum_value?: number
  maximum_value?: number
  value?: number
  value_step?: number
  discrete_slider?: boolean
  discrete_values?: boolean
}

/** @noSelf */
type MinimapGuiSpec = BaseGuiSpec & {
  type: "minimap"
  position?: Position
  surface_index?: number
  chart_player_index?: number
  force?: string
  zoom?: number
}

/** @noSelf */
type TabGuiSpec = BaseGuiSpec & {
  type: "tab"
  badge_text?: LocalisedString
}

/** @noSelf */
type SwitchGuiSpec = BaseGuiSpec & {
  type: "switch"
  switch_state?: SwitchState
  allow_none_state?: boolean
  left_label_caption?: LocalisedString
  left_label_tooltip?: LocalisedString
  right_label_caption?: LocalisedString
  right_label_tooltip?: LocalisedString
}

/** @noSelf */
type LabelGuiSpec = BaseGuiSpec & {
  type: "label"
}

/** @noSelf */
type EntityPreviewGuiSpec = BaseGuiSpec & {
  type: "entity-preview"
}

/** @noSelf */
type EmptyWidgetGuiSpec = BaseGuiSpec & {
  type: "empty-widget"
}

/** @noSelf */
type TabbedPaneGuiSpec = BaseGuiSpec & {
  type: "tabbed-pane"
}

/** @noSelf */
type GuiSpec =
  | ButtonGuiSpec
  | SpriteButtonGuiSpec
  | CheckboxGuiSpec
  | FlowGuiSpec
  | FrameGuiSpec
  | LabelGuiSpec
  | LineGuiSpec
  | ProgressbarGuiSpec
  | TableGuiSpec
  | TextfieldGuiSpec
  | RadiobuttonGuiSpec
  | SpriteGuiSpec
  | ScrollPaneGuiSpec
  | DropDownGuiSpec
  | ListBoxGuiSpec
  | CameraGuiSpec
  | ChooseElemButtonGuiSpec<any>
  | TextBoxGuiSpec
  | SliderGuiSpec
  | MinimapGuiSpec
  | EntityPreviewGuiSpec
  | EmptyWidgetGuiSpec
  | TabbedPaneGuiSpec
  | TabGuiSpec
  | SwitchGuiSpec

/** @noSelf */
type GuiSpecOfType<Type extends GuiElementType> = Extract<GuiSpec,
  { type: Type }>

// Element
/** @noSelf */
interface BaseGuiElement {
  // add<S extends GuiSpec>(element: S): GuiElementOfType<S["type"]>

  add<Type extends GuiElementType>(
    element: GuiSpecOfType<Type>,
  ): GuiElementOfType<Type>

  clear(): void

  destroy(): void

  get_mod(): void

  get_index_in_parent(): void

  focus(): void

  bring_to_front(): void

  readonly index: number
  readonly gui: LuaGui
  readonly parent: LuaGuiElement
  name: string
  caption: LocalisedString
  // TODO when Typescript 4.3 supported, different read/write types
  style: LuaStyle // | string
  visible: boolean
  readonly children_names: string[]
  readonly player_index: number
  tooltip: LocalisedString
  readonly type: string
  readonly children: LuaGuiElement[]
  location?: GuiLocation
  enabled: boolean
  ignored_by_interaction: boolean
  anchor: GuiAnchor
  tags: Tags
  readonly valid: boolean
  readonly object_name: string

  help(): void
}

/** @noSelf */
type ButtonGuiElement = BaseGuiElement & {
  type: "button"
  mouse_button_filter: MouseButtonFlags
}

/** @noSelf */
type FlowGuiElement = BaseGuiElement & {
  type: "flow"
  readonly direction: Direction
  drag_target: LuaGuiElement
}

/** @noSelf */
type FrameGuiElement = BaseGuiElement & {
  type: "frame"
  force_auto_center(): void
  readonly direction: Direction
  auto_center: boolean
  drag_target: LuaGuiElement
}

/** @noSelf */
type TableGuiElement = BaseGuiElement & {
  type: "table"
  draw_vertical_lines: boolean
  draw_horizontal_lines: boolean
  draw_horizontal_line_after_headers: boolean
  readonly column_count: number
  vertical_centering: boolean
  drag_target: LuaGuiElement
}

/** @noSelf */
type TextfieldGuiElement = BaseGuiElement & {
  type: "textfield"
  select_all(): void
  select(start: number, end: number): void
  text: string
  numeric: boolean
  allow_decimal: boolean
  allow_negative: boolean
  is_password: boolean
  lose_focus_on_confirm: boolean
  clear_and_focus_on_right_click: boolean
}

/** @noSelf */
type ProgressbarGuiElement = BaseGuiElement & {
  type: "progressbar"
  value: number
}

/** @noSelf */
type CheckboxGuiElement = BaseGuiElement & {
  type: "checkbox"
  state: boolean
}

/** @noSelf */
type RadiobuttonGuiElement = BaseGuiElement & {
  type: "radiobutton"
  state: boolean
}

/** @noSelf */
type SpriteButtonGuiElement = BaseGuiElement & {
  type: "sprite-button"
  sprite: SpritePath
  resize_to_sprite: boolean
  hovered_sprite: SpritePath
  clicked_sprite: SpritePath
  number: number
  show_percent_for_small_numbers: boolean
  mouse_button_filter: MouseButtonFlags
}

/** @noSelf */
type SpriteGuiElement = BaseGuiElement & {
  type: "sprite"
  sprite: SpritePath
  resize_to_sprite: boolean
}

/** @noSelf */
type ScrollPaneGuiElement = BaseGuiElement & {
  type: "scroll-pane"
  scroll_to_top(): void
  scroll_to_bottom(): void
  scroll_to_left(): void
  scroll_to_right(): void
  scroll_to_element(element: LuaGuiElement, scroll_mode?: ScrollMode): void
  horizontal_scroll_policy: ScrollPolicy
  vertical_scroll_policy: ScrollPolicy
}

/** @noSelf */
type LineGuiElement = BaseGuiElement & {
  type: "line"
  readonly direction: Direction
}

/** @noSelf */
type DropDownGuiElement = BaseGuiElement & {
  type: "drop-down"
  clear_items(): void
  get_item(index: number): LocalisedString
  set_item(index: number, arg_1: LocalisedString): void
  add_item(string: LocalisedString, index?: number): void
  remove_item(index: number): void
  selected_index: number
}

/** @noSelf */
type ListBoxGuiElement = BaseGuiElement & {
  type: "list-box"
  clear_items(): void
  get_item(index: number): LocalisedString
  set_item(index: number, arg_1: LocalisedString): void
  add_item(string: LocalisedString, index?: number): void
  remove_item(index: number): void
  scroll_to_item(index: number, scroll_mode?: ScrollMode): void
  selected_index: number
}

/** @noSelf */
type CameraGuiElement = BaseGuiElement & {
  type: "camera"
  position: Position
  surface_index: number
  zoom: number
  entity?: LuaEntity
}

/** @noSelf */
type MinimapGuiElement = BaseGuiElement & {
  type: "minimap"
  position: Position
  surface_index: number
  zoom: number
  minimap_player_index: number
  force?: string
  entity?: LuaEntity
}

/** @noSelf */
type ChooseElemButtonGuiElement = BaseGuiElement & {
  type: "choose-elem-button"
  readonly elem_type: string
  elem_value: string | SignalID

  elem_filters?: AnyPrototypeFilters
  locked: boolean
}

/** @noSelf */
type TextBoxGuiElement = BaseGuiElement & {
  type: "text-box"
  scroll_to_top(): void
  scroll_to_bottom(): void
  scroll_to_left(): void
  scroll_to_right(): void
  select_all(): void
  select(start: number, end: number): void
  text: string
  selectable: boolean
  word_wrap: boolean
  read_only: boolean
  clear_and_focus_on_right_click: boolean
}

/** @noSelf */
type SliderGuiElement = BaseGuiElement & {
  type: "slider"
  get_slider_minimum(): void
  get_slider_maximum(): void
  set_slider_minimum_maximum(minimum: number, maximum: number): void
  get_slider_value_step(): void
  get_slider_discrete_slider(): void
  get_slider_discrete_values(): void
  set_slider_value_step(value: number): void
  set_slider_discrete_slider(value: boolean): void
  set_slider_discrete_values(value: boolean): void
  slider_value: number
}

/** @noSelf */
type TabGuiElement = BaseGuiElement & {
  type: "tab"
  badge_text: LocalisedString
}

/** @noSelf */
type SwitchGuiElement = BaseGuiElement & {
  type: "switch"
  switch_state: SwitchState
  allow_none_state: boolean
  left_label_caption: LocalisedString
  left_label_tooltip: LocalisedString
  right_label_caption: LocalisedString
  right_label_tooltip: LocalisedString
}

/** @noSelf */
type LabelGuiElement = BaseGuiElement & {
  type: "label"
  drag_target: LuaGuiElement
}

/** @noSelf */
type EntityPreviewGuiElement = BaseGuiElement & {
  type: "entity-preview"
  entity?: LuaEntity
}

/** @noSelf */
type EmptyWidgetGuiElement = BaseGuiElement & {
  type: "empty-widget"
  drag_target: LuaGuiElement
}

/** @noSelf */
type TabbedPaneGuiElement = BaseGuiElement & {
  type: "tabbed-pane"
  add_tab(tab: TabGuiElement, content: LuaGuiElement): void
  remove_tab(tab: LuaGuiElement): void
  selected_tab_index: number
  readonly tabs: {
    tab: TabGuiElement
    content: LuaGuiElement
  }[]
}

type BareGuiElement =
  | ButtonGuiElement
  | SpriteButtonGuiElement
  | CheckboxGuiElement
  | FlowGuiElement
  | FrameGuiElement
  | LabelGuiElement
  | LineGuiElement
  | ProgressbarGuiElement
  | TableGuiElement
  | TextfieldGuiElement
  | RadiobuttonGuiElement
  | SpriteGuiElement
  | ScrollPaneGuiElement
  | DropDownGuiElement
  | ListBoxGuiElement
  | CameraGuiElement
  | ChooseElemButtonGuiElement
  | TextBoxGuiElement
  | SliderGuiElement
  | MinimapGuiElement
  | EntityPreviewGuiElement
  | EmptyWidgetGuiElement
  | TabbedPaneGuiElement
  | TabGuiElement
  | SwitchGuiElement

/** @noSelf */
type GuiElement = BareGuiElement &
  {
    [K in string]?: LuaGuiElement
  }

/** @noSelf */
type LuaGuiElement = GuiElement

/** @noSelf */
type BareGuiElementOfType<Type extends GuiElementType> = Extract<BareGuiElement,
  { type: Type }>

/** @noSelf */
type GuiElementOfType<Type extends GuiElementType> = Extract<LuaGuiElement,
  { type: Type }>

// Concepts

type Direction = "horizontal" | "vertical"

type ScrollPolicy =
  | "auto"
  | "never"
  | "always"
  | "auto-and-reserve-space"
  | "dont-show-but-allow-scrolling"

type ScrollMode = "in-view" | "top-third"

type SwitchState = "left" | "right" | "none"

type GuiElementType = LuaGuiElement["type"]
