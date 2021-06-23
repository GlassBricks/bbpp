const buttonGuiEvents: ButtonGuiEvents = {
  on_gui_click: true,
  on_gui_opened: true,
  on_gui_closed: true,
}
const spriteButtonGuiEvents: SpriteButtonGuiEvents = {
  on_gui_click: true,
  on_gui_opened: true,
  on_gui_closed: true,
}
const checkboxGuiEvents: CheckboxGuiEvents = {
  on_gui_click: true,
  on_gui_checked_state_changed: true,
  on_gui_opened: true,
  on_gui_closed: true,
}
const flowGuiEvents: FlowGuiEvents = {
  on_gui_click: true,
  on_gui_opened: true,
  on_gui_closed: true,
}
const frameGuiEvents: FrameGuiEvents = {
  on_gui_click: true,
  on_gui_location_changed: true,
  on_gui_opened: true,
  on_gui_closed: true,
}
const labelGuiEvents: LabelGuiEvents = {
  on_gui_click: true,
  on_gui_opened: true,
  on_gui_closed: true,
}
const lineGuiEvents: LineGuiEvents = {
  on_gui_click: true,
  on_gui_opened: true,
  on_gui_closed: true,
}
const progressbarGuiEvents: ProgressbarGuiEvents = {
  on_gui_click: true,
  on_gui_opened: true,
  on_gui_closed: true,
}
const tableGuiEvents: TableGuiEvents = {
  on_gui_click: true,
  on_gui_opened: true,
  on_gui_closed: true,
}
const textfieldGuiEvents: TextfieldGuiEvents = {
  on_gui_click: true,
  on_gui_confirmed: true,
  on_gui_text_changed: true,
  on_gui_opened: true,
  on_gui_closed: true,
}
const radiobuttonGuiEvents: RadiobuttonGuiEvents = {
  on_gui_click: true,
  on_gui_checked_state_changed: true,
  on_gui_opened: true,
  on_gui_closed: true,
}
const spriteGuiEvents: SpriteGuiEvents = {
  on_gui_click: true,
  on_gui_opened: true,
  on_gui_closed: true,
}
const scrollPaneGuiEvents: ScrollPaneGuiEvents = {
  on_gui_click: true,
  on_gui_opened: true,
  on_gui_closed: true,
}
const dropDownGuiEvents: DropDownGuiEvents = {
  on_gui_click: true,
  on_gui_selection_state_changed: true,
  on_gui_opened: true,
  on_gui_closed: true,
}
const listBoxGuiEvents: ListBoxGuiEvents = {
  on_gui_click: true,
  on_gui_selection_state_changed: true,
  on_gui_opened: true,
  on_gui_closed: true,
}
const cameraGuiEvents: CameraGuiEvents = {
  on_gui_click: true,
  on_gui_opened: true,
  on_gui_closed: true,
}
const chooseElemButtonGuiEvents: ChooseElemButtonGuiEvents = {
  on_gui_click: true,
  on_gui_elem_changed: true,
  on_gui_opened: true,
  on_gui_closed: true,
}
const textBoxGuiEvents: TextBoxGuiEvents = {
  on_gui_click: true,
  on_gui_confirmed: true,
  on_gui_text_changed: true,
  on_gui_opened: true,
  on_gui_closed: true,
}
const sliderGuiEvents: SliderGuiEvents = {
  on_gui_click: true,
  on_gui_value_changed: true,
  on_gui_opened: true,
  on_gui_closed: true,
}
const minimapGuiEvents: MinimapGuiEvents = {
  on_gui_click: true,
  on_gui_opened: true,
  on_gui_closed: true,
}
const entityPreviewGuiEvents: EntityPreviewGuiEvents = {
  on_gui_click: true,
  on_gui_opened: true,
  on_gui_closed: true,
}
const emptyWidgetGuiEvents: EmptyWidgetGuiEvents = {
  on_gui_click: true,
  on_gui_opened: true,
  on_gui_closed: true,
}
const tabbedPaneGuiEvents: TabbedPaneGuiEvents = {
  on_gui_click: true,
  on_gui_selected_tab_changed: true,
  on_gui_opened: true,
  on_gui_closed: true,
}
const tabGuiEvents: TabGuiEvents = {
  on_gui_click: true,
  on_gui_opened: true,
  on_gui_closed: true,
}
const switchGuiEvents: SwitchGuiEvents = {
  on_gui_click: true,
  on_gui_switch_state_changed: true,
  on_gui_opened: true,
  on_gui_closed: true,
}

export const guiEventsByType: GuiEventsByType = {
  "choose-elem-button": chooseElemButtonGuiEvents,
  "drop-down": dropDownGuiEvents,
  "empty-widget": emptyWidgetGuiEvents,
  "entity-preview": entityPreviewGuiEvents,
  "list-box": listBoxGuiEvents,
  "scroll-pane": scrollPaneGuiEvents,
  "sprite-button": spriteButtonGuiEvents,
  "tabbed-pane": tabbedPaneGuiEvents,
  "text-box": textBoxGuiEvents,
  button: buttonGuiEvents,
  camera: cameraGuiEvents,
  checkbox: checkboxGuiEvents,
  flow: flowGuiEvents,
  frame: frameGuiEvents,
  label: labelGuiEvents,
  line: lineGuiEvents,
  minimap: minimapGuiEvents,
  progressbar: progressbarGuiEvents,
  radiobutton: radiobuttonGuiEvents,
  slider: sliderGuiEvents,
  sprite: spriteGuiEvents,
  switch: switchGuiEvents,
  tab: tabGuiEvents,
  table: tableGuiEvents,
  textfield: textfieldGuiEvents,
}
