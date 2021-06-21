/** @noSelfInFile */

type GuiElementType =
  | "choose-elem-button"
  | "drop-down"
  | "empty-widget"
  | "entity-preview"
  | "list-box"
  | "scroll-pane"
  | "sprite-button"
  | "tabbed-pane"
  | "text-box"
  | "button"
  | "camera"
  | "checkbox"
  | "flow"
  | "frame"
  | "label"
  | "line"
  | "minimap"
  | "progressbar"
  | "radiobutton"
  | "slider"
  | "sprite"
  | "switch"
  | "tab"
  | "table"
  | "textfield"

/** @noSelf */
interface BaseGuiSpec {
  readonly type: GuiElementType
  name?: string
  caption?: LocalisedString
  tooltip?: LocalisedString
  enabled?: boolean
  visible?: boolean
  ignored_by_interaction?: boolean
  style?: LuaStyle | string
  tags?: Tags
  index?: number
  anchor?: GuiAnchor
}

/** @noSelf */
interface ButtonGuiSpec extends BaseGuiSpec {
  type: "button"
  mouse_button_filter?: MouseButtonFlags
}

/** @noSelf */
interface FlowGuiSpec extends BaseGuiSpec {
  type: "flow"
  direction?: Direction
}

/** @noSelf */
interface FrameGuiSpec extends BaseGuiSpec {
  type: "frame"
  direction?: Direction
}

/** @noSelf */
interface TableGuiSpec extends BaseGuiSpec {
  type: "table"
  column_count: number
  draw_vertical_lines?: boolean
  draw_horizontal_lines?: boolean
  draw_horizontal_line_after_headers?: boolean
  vertical_centering?: boolean
}

/** @noSelf */
interface TextfieldGuiSpec extends BaseGuiSpec {
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
interface ProgressbarGuiSpec extends BaseGuiSpec {
  type: "progressbar"
  value?: number
}

/** @noSelf */
interface CheckboxGuiSpec extends BaseGuiSpec {
  type: "checkbox"
  state: boolean
}

/** @noSelf */
interface RadiobuttonGuiSpec extends BaseGuiSpec {
  type: "radiobutton"
  state: boolean
}

/** @noSelf */
interface SpriteButtonGuiSpec extends BaseGuiSpec {
  type: "sprite-button"
  sprite?: SpritePath
  hovered_sprite?: SpritePath
  clicked_sprite?: SpritePath
  number?: number
  show_percent_for_small_numbers?: boolean
  mouse_button_filter?: MouseButtonFlags
}

/** @noSelf */
interface SpriteGuiSpec extends BaseGuiSpec {
  type: "sprite"
  sprite?: SpritePath
  resize_to_sprite?: boolean
}

/** @noSelf */
interface ScrollPaneGuiSpec extends BaseGuiSpec {
  type: "scroll-pane"
  horizontal_scroll_policy?: ScrollPolicy
  vertical_scroll_policy?: ScrollPolicy
}

/** @noSelf */
interface DropDownGuiSpec extends BaseGuiSpec {
  type: "drop-down"
  items?: [LocalisedString]
  selected_index?: number
}

/** @noSelf */
interface LineGuiSpec extends BaseGuiSpec {
  type: "line"
  direction: Direction
}

/** @noSelf */
interface ListBoxGuiSpec extends BaseGuiSpec {
  type: "list-box"
  items?: LocalisedString[]
  selected_index?: number
}

/** @noSelf */
interface CameraGuiSpec extends BaseGuiSpec {
  type: "camera"
  surface_index?: number
  zoom?: number

  set position(position: PositionIn)

  get position(): Position
}

/** @noSelf */
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

type ChooseElementButtonItem<Type extends keyof ChooseElemButtonTypes> = {
  [T in keyof ChooseElemButtonTypes as T extends Type ? T : never]?: ChooseElemButtonTypes[T]
}

/** @noSelf */
interface ChooseElemButtonGuiSpec<Type extends keyof ChooseElemButtonTypes = keyof ChooseElemButtonTypes>
  extends BaseGuiSpec,
    ChooseElementButtonItem<Type> {
  type: "choose-elem-button"
  elem_type: Type
}

/** @noSelf */
interface TextBoxGuiSpec extends BaseGuiSpec {
  type: "text-box"
  text?: string
  clear_and_focus_on_right_click?: boolean
}

/** @noSelf */
interface SliderGuiSpec extends BaseGuiSpec {
  type: "slider"
  minimum_value?: number
  maximum_value?: number
  value?: number
  value_step?: number
  discrete_slider?: boolean
  discrete_values?: boolean
}

/** @noSelf */
interface MinimapGuiSpec extends BaseGuiSpec {
  type: "minimap"
  position?: Position
  surface_index?: number
  chart_player_index?: number
  force?: string
  zoom?: number
}

/** @noSelf */
interface TabGuiSpec extends BaseGuiSpec {
  type: "tab"
  badge_text?: LocalisedString
}

/** @noSelf */
interface SwitchGuiSpec extends BaseGuiSpec {
  type: "switch"
  switch_state?: SwitchState
  allow_none_state?: boolean
  left_label_caption?: LocalisedString
  left_label_tooltip?: LocalisedString
  right_label_caption?: LocalisedString
  right_label_tooltip?: LocalisedString
}

/** @noSelf */
interface LabelGuiSpec extends BaseGuiSpec {
  type: "label"
}

/** @noSelf */
interface EntityPreviewGuiSpec extends BaseGuiSpec {
  type: "entity-preview"
}

/** @noSelf */
interface EmptyWidgetGuiSpec extends BaseGuiSpec {
  type: "empty-widget"
}

/** @noSelf */
interface TabbedPaneGuiSpec extends BaseGuiSpec {
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
type GuiSpecOfType<Type extends GuiElementType> = Extract<GuiSpec, { type: Type }>

// Element
/** @noSelf */
interface BaseGuiElement extends LuaReadonlyIndexing<string, LuaGuiElement | undefined> {
  readonly type: GuiElementType
  readonly index: number
  readonly gui: LuaGui
  readonly parent: LuaGuiElement
  name: string
  caption: LocalisedString
  // todo: different input/output props WITH selection?
  style: LuaStyle | string
  visible: boolean
  readonly children_names: string[]
  readonly player_index: number
  tooltip: LocalisedString
  readonly children: LuaGuiElement[]
  location?: GuiLocation
  enabled: boolean
  ignored_by_interaction: boolean
  anchor: GuiAnchor
  tags: Tags
  readonly valid: boolean
  readonly object_name: string

  // add<S extends GuiSpec>(element: S): GuiElementOfType<S["type"]>
  add<Type extends GuiElementType>(element: GuiSpecOfType<Type>): GuiElementOfType<Type>

  clear(): void

  destroy(): void

  get_mod(): void

  get_index_in_parent(): void

  focus(): void

  bring_to_front(): void

  help(): void
}

/** @noSelf */
interface ButtonGuiElement extends BaseGuiElement {
  type: "button"
  mouse_button_filter: MouseButtonFlags
}

/** @noSelf */
interface FlowGuiElement extends BaseGuiElement {
  type: "flow"
  readonly direction: Direction
  drag_target: LuaGuiElement
}

/** @noSelf */
interface FrameGuiElement extends BaseGuiElement {
  type: "frame"
  readonly direction: Direction
  auto_center: boolean
  drag_target: LuaGuiElement

  force_auto_center(): void
}

/** @noSelf */
interface TableGuiElement extends BaseGuiElement {
  type: "table"
  draw_vertical_lines: boolean
  draw_horizontal_lines: boolean
  draw_horizontal_line_after_headers: boolean
  readonly column_count: number
  vertical_centering: boolean
  drag_target: LuaGuiElement
}

/** @noSelf */
interface TextfieldGuiElement extends BaseGuiElement {
  type: "textfield"
  text: string
  numeric: boolean
  allow_decimal: boolean
  allow_negative: boolean
  is_password: boolean
  lose_focus_on_confirm: boolean
  clear_and_focus_on_right_click: boolean

  select_all(): void

  select(start: number, end: number): void
}

/** @noSelf */
interface ProgressbarGuiElement extends BaseGuiElement {
  type: "progressbar"
  value: number
}

/** @noSelf */
interface CheckboxGuiElement extends BaseGuiElement {
  type: "checkbox"
  state: boolean
}

/** @noSelf */
interface RadiobuttonGuiElement extends BaseGuiElement {
  type: "radiobutton"
  state: boolean
}

/** @noSelf */
interface SpriteButtonGuiElement extends BaseGuiElement {
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
interface SpriteGuiElement extends BaseGuiElement {
  type: "sprite"
  sprite: SpritePath
  resize_to_sprite: boolean
}

/** @noSelf */
interface ScrollPaneGuiElement extends BaseGuiElement {
  type: "scroll-pane"
  horizontal_scroll_policy: ScrollPolicy
  vertical_scroll_policy: ScrollPolicy

  scroll_to_top(): void

  scroll_to_bottom(): void

  scroll_to_left(): void

  scroll_to_right(): void

  scroll_to_element(element: LuaGuiElement, scroll_mode?: ScrollMode): void
}

/** @noSelf */
interface LineGuiElement extends BaseGuiElement {
  type: "line"
  readonly direction: Direction
}

/** @noSelf */
interface DropDownGuiElement extends BaseGuiElement {
  type: "drop-down"
  selected_index: number

  clear_items(): void

  get_item(index: number): LocalisedString

  set_item(index: number, arg_1: LocalisedString): void

  add_item(string: LocalisedString, index?: number): void

  remove_item(index: number): void
}

/** @noSelf */
interface ListBoxGuiElement extends BaseGuiElement {
  /** @noSelf */ type: "list-box"
  selected_index: number

  clear_items(): void

  get_item(index: number): LocalisedString

  set_item(index: number, arg_1: LocalisedString): void

  add_item(string: LocalisedString, index?: number): void

  remove_item(index: number): void

  scroll_to_item(index: number, scroll_mode?: ScrollMode): void
}

/** @noSelf */
interface CameraGuiElement extends BaseGuiElement {
  type: "camera"
  surface_index: number
  zoom: number
  entity?: LuaEntity

  set position(position: PositionIn)

  get position(): Position
}

/** @noSelf */
interface MinimapGuiElement extends BaseGuiElement {
  type: "minimap"
  surface_index: number
  zoom: number
  minimap_player_index: number
  force?: string
  entity?: LuaEntity

  set position(position: PositionIn)

  get position(): Position
}

/** @noSelf */
interface ChooseElemButtonGuiElement extends BaseGuiElement {
  type: "choose-elem-button"
  readonly elem_type: string
  elem_value: string | SignalID
  elem_filters?: AnyPrototypeFilters
  locked: boolean
}

/** @noSelf */
interface TextBoxGuiElement extends BaseGuiElement {
  type: "text-box"
  text: string
  selectable: boolean
  word_wrap: boolean
  read_only: boolean
  clear_and_focus_on_right_click: boolean

  scroll_to_top(): void

  scroll_to_bottom(): void

  scroll_to_left(): void

  scroll_to_right(): void

  select_all(): void

  select(start: number, end: number): void
}

/** @noSelf */
interface SliderGuiElement extends BaseGuiElement {
  type: "slider"
  slider_value: number

  get_slider_minimum(): void

  get_slider_maximum(): void

  set_slider_minimum_maximum(minimum: number, maximum: number): void

  get_slider_value_step(): void

  get_slider_discrete_slider(): void

  get_slider_discrete_values(): void

  set_slider_value_step(value: number): void

  set_slider_discrete_slider(value: boolean): void

  set_slider_discrete_values(value: boolean): void
}

/** @noSelf */
interface TabGuiElement extends BaseGuiElement {
  type: "tab"
  badge_text: LocalisedString
}

/** @noSelf */
interface SwitchGuiElement extends BaseGuiElement {
  type: "switch"
  switch_state: SwitchState
  allow_none_state: boolean
  left_label_caption: LocalisedString
  left_label_tooltip: LocalisedString
  right_label_caption: LocalisedString
  right_label_tooltip: LocalisedString
}

/** @noSelf */
interface LabelGuiElement extends BaseGuiElement {
  type: "label"
  drag_target: LuaGuiElement
}

/** @noSelf */
interface EntityPreviewGuiElement extends BaseGuiElement {
  type: "entity-preview"
  entity?: LuaEntity
}

/** @noSelf */
interface EmptyWidgetGuiElement extends BaseGuiElement {
  type: "empty-widget"
  drag_target: LuaGuiElement
}

/** @noSelf */
interface TabbedPaneGuiElement extends BaseGuiElement {
  type: "tabbed-pane"
  selected_tab_index: number
  readonly tabs: {
    tab: TabGuiElement
    content: LuaGuiElement
  }[]

  add_tab(tab: TabGuiElement, content: LuaGuiElement): void

  remove_tab(tab: LuaGuiElement): void
}

/** @noSelf */
type LuaGuiElement =
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
type GuiElementOfType<Type extends GuiElementType> = Extract<LuaGuiElement, { type: Type }>

// Concepts

type Direction = "horizontal" | "vertical"

type ScrollPolicy = "auto" | "never" | "always" | "auto-and-reserve-space" | "dont-show-but-allow-scrolling"

type ScrollMode = "in-view" | "top-third"

type SwitchState = "left" | "right" | "none"
