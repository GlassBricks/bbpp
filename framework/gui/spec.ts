import { GameEvents } from "../events"
import { guiEventNameMapping } from "./guievents"
import { FuncRef } from "../funcRef"

type ReverseGuiEventNameMapping = {
  [P in keyof typeof guiEventNameMapping as typeof guiEventNameMapping[P]]: P
}
type FlexiblePayloadOf<T> = T extends keyof GameEvents ? GameEvents[T]["#payloadType"] : unknown

export type GuiEventHandlers<GuiEvents, Element> = {
  [N in keyof GuiEvents as N extends keyof ReverseGuiEventNameMapping
    ? ReverseGuiEventNameMapping[N]
    : never]?: FuncRef<(element: Element, payload: FlexiblePayloadOf<N>) => void>
}

// This type is separate from ElementSpecOfType as it is used by jsx defs
export type ElementSpecProps<Element extends BaseGuiElement> = JSX.IntrinsicAttributes & {
  onCreated?: (element: Element) => void
  onLateCreated?: (element: Element) => void
  onUpdate?: (element: Element) => void
  onLateUpdate?: (element: Element) => void

  updateOnly?: boolean

  styleMod?: ModOf<LuaStyle>
}

export type ElementSpecOf<
  Element extends BaseGuiElement,
  AddSpec extends BaseAddSpec,
  GuiEvents
> = ElementSpecProps<Element> &
  GuiEventHandlers<GuiEvents, Element> & {
    type: Element["type"]
    creationSpec?: Omit<AddSpec, "type" | "index">
    elementMod?: ModOf<Element>
    children?: (ElementSpecByType[GuiElementType] | ComponentSpec<any> | BlankSpec)[]
  }

export type ChooseElemButtonElementSpec = ElementSpecOf<
  ChooseElemButtonGuiElement,
  ChooseElemButtonAddSpec,
  ChooseElemButtonEvents
>
export type DropDownElementSpec = ElementSpecOf<DropDownGuiElement, DropDownAddSpec, DropDownEvents>
export type EmptyWidgetElementSpec = ElementSpecOf<EmptyWidgetGuiElement, EmptyWidgetAddSpec, EmptyWidgetEvents>
export type EntityPreviewElementSpec = ElementSpecOf<EntityPreviewGuiElement, EntityPreviewAddSpec, EntityPreviewEvents>
export type ListBoxElementSpec = ElementSpecOf<ListBoxGuiElement, ListBoxAddSpec, ListBoxEvents>
export type ScrollPaneElementSpec = ElementSpecOf<ScrollPaneGuiElement, ScrollPaneAddSpec, ScrollPaneEvents>
export type SpriteButtonElementSpec = ElementSpecOf<SpriteButtonGuiElement, SpriteButtonAddSpec, SpriteButtonEvents>
export type TabbedPaneElementSpec = ElementSpecOf<TabbedPaneGuiElement, TabbedPaneAddSpec, TabbedPaneEvents>
export type TextBoxElementSpec = ElementSpecOf<TextBoxGuiElement, TextBoxAddSpec, TextBoxEvents>
export type ButtonElementSpec = ElementSpecOf<ButtonGuiElement, ButtonAddSpec, ButtonEvents>
export type CameraElementSpec = ElementSpecOf<CameraGuiElement, CameraAddSpec, CameraEvents>
export type CheckboxElementSpec = ElementSpecOf<CheckboxGuiElement, CheckboxAddSpec, CheckboxEvents>
export type FlowElementSpec = ElementSpecOf<FlowGuiElement, FlowAddSpec, FlowEvents>
export type FrameElementSpec = ElementSpecOf<FrameGuiElement, FrameAddSpec, FrameEvents>
export type LabelElementSpec = ElementSpecOf<LabelGuiElement, LabelAddSpec, LabelEvents>
export type LineElementSpec = ElementSpecOf<LineGuiElement, LineAddSpec, LineEvents>
export type MinimapElementSpec = ElementSpecOf<MinimapGuiElement, MinimapAddSpec, MinimapEvents>
export type ProgressbarElementSpec = ElementSpecOf<ProgressbarGuiElement, ProgressbarAddSpec, ProgressbarEvents>
export type RadiobuttonElementSpec = ElementSpecOf<RadiobuttonGuiElement, RadiobuttonAddSpec, RadiobuttonEvents>
export type SliderElementSpec = ElementSpecOf<SliderGuiElement, SliderAddSpec, SliderEvents>
export type SpriteElementSpec = ElementSpecOf<SpriteGuiElement, SpriteAddSpec, SpriteEvents>
export type SwitchElementSpec = ElementSpecOf<SwitchGuiElement, SwitchAddSpec, SwitchEvents>
export type TabElementSpec = ElementSpecOf<TabGuiElement, TabAddSpec, TabEvents>
export type TableElementSpec = ElementSpecOf<TableGuiElement, TableAddSpec, TableEvents>
export type TextfieldElementSpec = ElementSpecOf<TextfieldGuiElement, TextfieldAddSpec, TextfieldEvents>

export interface ElementSpecByType {
  "choose-elem-button": ChooseElemButtonElementSpec
  "drop-down": DropDownElementSpec
  "empty-widget": EmptyWidgetElementSpec
  "entity-preview": EntityPreviewElementSpec
  "list-box": ListBoxElementSpec
  "scroll-pane": ScrollPaneElementSpec
  "sprite-button": SpriteButtonElementSpec
  "tabbed-pane": TabbedPaneElementSpec
  "text-box": TextBoxElementSpec
  button: ButtonElementSpec
  camera: CameraElementSpec
  checkbox: CheckboxElementSpec
  flow: FlowElementSpec
  frame: FrameElementSpec
  label: LabelElementSpec
  line: LineElementSpec
  minimap: MinimapElementSpec
  progressbar: ProgressbarElementSpec
  radiobutton: RadiobuttonElementSpec
  slider: SliderElementSpec
  sprite: SpriteElementSpec
  switch: SwitchElementSpec
  tab: TabElementSpec
  table: TableElementSpec
  textfield: TextfieldElementSpec
}

export type ElementSpec = ElementSpecByType[GuiElementType]

export interface BlankSpec {
  type: "blank"
  name?: string
  children?: AnySpec[]
}

// Component
export interface ComponentSpec<Props> extends JSX.IntrinsicAttributes {
  type: string
  props: Props
}

export type AnySpec = ElementSpecByType[GuiElementType] | ComponentSpec<any> | BlankSpec
