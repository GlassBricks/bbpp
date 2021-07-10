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
interface BaseGuiAddSpec {
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
interface ButtonGuiAddSpec extends BaseGuiAddSpec {
  type: "button"
  mouse_button_filter?: MouseButtonFlags
}

/** @noSelf */
interface FlowGuiAddSpec extends BaseGuiAddSpec {
  type: "flow"
  direction?: Direction
}

/** @noSelf */
interface FrameGuiAddSpec extends BaseGuiAddSpec {
  type: "frame"
  direction?: Direction
}

/** @noSelf */
interface TableGuiAddSpec extends BaseGuiAddSpec {
  type: "table"
  column_count: number
  draw_vertical_lines?: boolean
  draw_horizontal_lines?: boolean
  draw_horizontal_line_after_headers?: boolean
  vertical_centering?: boolean
}

/** @noSelf */
interface TextfieldGuiAddSpec extends BaseGuiAddSpec {
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
interface ProgressbarGuiAddSpec extends BaseGuiAddSpec {
  type: "progressbar"
  value?: number
}

/** @noSelf */
interface CheckboxGuiAddSpec extends BaseGuiAddSpec {
  type: "checkbox"
  state: boolean
}

/** @noSelf */
interface RadiobuttonGuiAddSpec extends BaseGuiAddSpec {
  type: "radiobutton"
  state: boolean
}

/** @noSelf */
interface SpriteButtonGuiAddSpec extends BaseGuiAddSpec {
  type: "sprite-button"
  sprite?: SpritePath
  hovered_sprite?: SpritePath
  clicked_sprite?: SpritePath
  number?: number
  show_percent_for_small_numbers?: boolean
  mouse_button_filter?: MouseButtonFlags
}

/** @noSelf */
interface SpriteGuiAddSpec extends BaseGuiAddSpec {
  type: "sprite"
  sprite?: SpritePath
  resize_to_sprite?: boolean
}

/** @noSelf */
interface ScrollPaneGuiAddSpec extends BaseGuiAddSpec {
  type: "scroll-pane"
  horizontal_scroll_policy?: ScrollPolicy
  vertical_scroll_policy?: ScrollPolicy
}

/** @noSelf */
interface DropDownGuiAddSpec extends BaseGuiAddSpec {
  type: "drop-down"
  items?: [LocalisedString]
  selected_index?: number
}

/** @noSelf */
interface LineGuiAddSpec extends BaseGuiAddSpec {
  type: "line"
  direction: Direction
}

/** @noSelf */
interface ListBoxGuiAddSpec extends BaseGuiAddSpec {
  type: "list-box"
  items?: LocalisedString[]
  selected_index?: number
}

/** @noSelf */
interface CameraGuiAddSpec extends BaseGuiAddSpec {
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
interface ChooseElemButtonGuiAddSpec<Type extends keyof ChooseElemButtonTypes = keyof ChooseElemButtonTypes>
  extends BaseGuiAddSpec,
    ChooseElementButtonItem<Type> {
  type: "choose-elem-button"
  elem_type: Type
}

/** @noSelf */
interface TextBoxGuiAddSpec extends BaseGuiAddSpec {
  type: "text-box"
  text?: string
  clear_and_focus_on_right_click?: boolean
}

/** @noSelf */
interface SliderGuiAddSpec extends BaseGuiAddSpec {
  type: "slider"
  minimum_value?: number
  maximum_value?: number
  value?: number
  value_step?: number
  discrete_slider?: boolean
  discrete_values?: boolean
}

/** @noSelf */
interface MinimapGuiAddSpec extends BaseGuiAddSpec {
  type: "minimap"
  position?: Position
  surface_index?: number
  chart_player_index?: number
  force?: string
  zoom?: number
}

/** @noSelf */
interface TabGuiAddSpec extends BaseGuiAddSpec {
  type: "tab"
  badge_text?: LocalisedString
}

/** @noSelf */
interface SwitchGuiAddSpec extends BaseGuiAddSpec {
  type: "switch"
  switch_state?: SwitchState
  allow_none_state?: boolean
  left_label_caption?: LocalisedString
  left_label_tooltip?: LocalisedString
  right_label_caption?: LocalisedString
  right_label_tooltip?: LocalisedString
}

/** @noSelf */
interface LabelGuiAddSpec extends BaseGuiAddSpec {
  type: "label"
}

/** @noSelf */
interface EntityPreviewGuiAddSpec extends BaseGuiAddSpec {
  type: "entity-preview"
}

/** @noSelf */
interface EmptyWidgetGuiAddSpec extends BaseGuiAddSpec {
  type: "empty-widget"
}

/** @noSelf */
interface TabbedPaneGuiAddSpec extends BaseGuiAddSpec {
  type: "tabbed-pane"
}

interface GuiAddSpecByType {
  "choose-elem-button": ChooseElemButtonGuiAddSpec
  "drop-down": DropDownGuiAddSpec
  "empty-widget": EmptyWidgetGuiAddSpec
  "entity-preview": EntityPreviewGuiAddSpec
  "list-box": ListBoxGuiAddSpec
  "scroll-pane": ScrollPaneGuiAddSpec
  "sprite-button": SpriteButtonGuiAddSpec
  "tabbed-pane": TabbedPaneGuiAddSpec
  "text-box": TextBoxGuiAddSpec
  button: ButtonGuiAddSpec
  camera: CameraGuiAddSpec
  checkbox: CheckboxGuiAddSpec
  flow: FlowGuiAddSpec
  frame: FrameGuiAddSpec
  label: LabelGuiAddSpec
  line: LineGuiAddSpec
  minimap: MinimapGuiAddSpec
  progressbar: ProgressbarGuiAddSpec
  radiobutton: RadiobuttonGuiAddSpec
  slider: SliderGuiAddSpec
  sprite: SpriteGuiAddSpec
  switch: SwitchGuiAddSpec
  tab: TabGuiAddSpec
  table: TableGuiAddSpec
  textfield: TextfieldGuiAddSpec
}

/** @noSelf */
type GuiAddSpec = GuiAddSpecByType[GuiElementType]

// Element
/** @noSelf */
interface BaseGuiElement extends LuaReadonlyIndexing<string, LuaGuiElement | undefined> {
  readonly type: GuiElementType
  readonly index: number
  readonly gui: LuaGui
  readonly parent: LuaGuiElement
  name: string
  caption: LocalisedString
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

  add<Spec extends GuiAddSpec>(element: Spec): GuiElementByType[Spec["type"]]

  clear(): void

  destroy(): void

  get_mod(): string | undefined

  get_index_in_parent(): number

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
  type: "list-box"
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

interface GuiElementByType {
  "choose-elem-button": ChooseElemButtonGuiElement
  "drop-down": DropDownGuiElement
  "empty-widget": EmptyWidgetGuiElement
  "entity-preview": EntityPreviewGuiElement
  "list-box": ListBoxGuiElement
  "scroll-pane": ScrollPaneGuiElement
  "sprite-button": SpriteButtonGuiElement
  "tabbed-pane": TabbedPaneGuiElement
  "text-box": TextBoxGuiElement
  button: ButtonGuiElement
  camera: CameraGuiElement
  checkbox: CheckboxGuiElement
  flow: FlowGuiElement
  frame: FrameGuiElement
  label: LabelGuiElement
  line: LineGuiElement
  minimap: MinimapGuiElement
  progressbar: ProgressbarGuiElement
  radiobutton: RadiobuttonGuiElement
  slider: SliderGuiElement
  sprite: SpriteGuiElement
  switch: SwitchGuiElement
  tab: TabGuiElement
  table: TableGuiElement
  textfield: TextfieldGuiElement
}

/** @noSelf */
type LuaGuiElement = GuiElementByType[GuiElementType]

// gui events
interface ButtonGuiEvents {
  on_gui_click: true
  on_gui_opened: true
  on_gui_closed: true
}

interface SpriteButtonGuiEvents {
  on_gui_click: true
  on_gui_opened: true
  on_gui_closed: true
}

interface CheckboxGuiEvents {
  on_gui_click: true
  on_gui_checked_state_changed: true
  on_gui_opened: true
  on_gui_closed: true
}

interface FlowGuiEvents {
  on_gui_click: true
  on_gui_opened: true
  on_gui_closed: true
}

interface FrameGuiEvents {
  on_gui_click: true
  on_gui_location_changed: true
  on_gui_opened: true
  on_gui_closed: true
}

interface LabelGuiEvents {
  on_gui_click: true
  on_gui_opened: true
  on_gui_closed: true
}

interface LineGuiEvents {
  on_gui_click: true
  on_gui_opened: true
  on_gui_closed: true
}

interface ProgressbarGuiEvents {
  on_gui_click: true
  on_gui_opened: true
  on_gui_closed: true
}

interface TableGuiEvents {
  on_gui_click: true
  on_gui_opened: true
  on_gui_closed: true
}

interface TextfieldGuiEvents {
  on_gui_click: true
  on_gui_confirmed: true
  on_gui_text_changed: true
  on_gui_opened: true
  on_gui_closed: true
}

interface RadiobuttonGuiEvents {
  on_gui_click: true
  on_gui_checked_state_changed: true
  on_gui_opened: true
  on_gui_closed: true
}

interface SpriteGuiEvents {
  on_gui_click: true
  on_gui_opened: true
  on_gui_closed: true
}

interface ScrollPaneGuiEvents {
  on_gui_click: true
  on_gui_opened: true
  on_gui_closed: true
}

interface DropDownGuiEvents {
  on_gui_click: true
  on_gui_selection_state_changed: true
  on_gui_opened: true
  on_gui_closed: true
}

interface ListBoxGuiEvents {
  on_gui_click: true
  on_gui_selection_state_changed: true
  on_gui_opened: true
  on_gui_closed: true
}

interface CameraGuiEvents {
  on_gui_click: true
  on_gui_opened: true
  on_gui_closed: true
}

interface ChooseElemButtonGuiEvents {
  on_gui_click: true
  on_gui_elem_changed: true
  on_gui_opened: true
  on_gui_closed: true
}

interface TextBoxGuiEvents {
  on_gui_click: true
  on_gui_confirmed: true
  on_gui_text_changed: true
  on_gui_opened: true
  on_gui_closed: true
}

interface SliderGuiEvents {
  on_gui_click: true
  on_gui_value_changed: true
  on_gui_opened: true
  on_gui_closed: true
}

interface MinimapGuiEvents {
  on_gui_click: true
  on_gui_opened: true
  on_gui_closed: true
}

interface EntityPreviewGuiEvents {
  on_gui_click: true
  on_gui_opened: true
  on_gui_closed: true
}

interface EmptyWidgetGuiEvents {
  on_gui_click: true
  on_gui_opened: true
  on_gui_closed: true
}

interface TabbedPaneGuiEvents {
  on_gui_click: true
  on_gui_selected_tab_changed: true
  on_gui_opened: true
  on_gui_closed: true
}

interface TabGuiEvents {
  on_gui_click: true
  on_gui_opened: true
  on_gui_closed: true
}

interface SwitchGuiEvents {
  on_gui_click: true
  on_gui_switch_state_changed: true
  on_gui_opened: true
  on_gui_closed: true
}

interface GuiEventsByType {
  "choose-elem-button": ChooseElemButtonGuiEvents
  "drop-down": DropDownGuiEvents
  "empty-widget": EmptyWidgetGuiEvents
  "entity-preview": EntityPreviewGuiEvents
  "list-box": ListBoxGuiEvents
  "scroll-pane": ScrollPaneGuiEvents
  "sprite-button": SpriteButtonGuiEvents
  "tabbed-pane": TabbedPaneGuiEvents
  "text-box": TextBoxGuiEvents
  button: ButtonGuiEvents
  camera: CameraGuiEvents
  checkbox: CheckboxGuiEvents
  flow: FlowGuiEvents
  frame: FrameGuiEvents
  label: LabelGuiEvents
  line: LineGuiEvents
  minimap: MinimapGuiEvents
  progressbar: ProgressbarGuiEvents
  radiobutton: RadiobuttonGuiEvents
  slider: SliderGuiEvents
  sprite: SpriteGuiEvents
  switch: SwitchGuiEvents
  tab: TabGuiEvents
  table: TableGuiEvents
  textfield: TextfieldGuiEvents
}

// Concepts

type Direction = "horizontal" | "vertical"

type ScrollPolicy = "auto" | "never" | "always" | "auto-and-reserve-space" | "dont-show-but-allow-scrolling"

type ScrollMode = "in-view" | "top-third"

type SwitchState = "left" | "right" | "none"
