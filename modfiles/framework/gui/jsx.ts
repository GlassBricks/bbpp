/** @noSelfInFile */
import {
  AnySpec,
  BlankSpec,
  ComponentSpec,
  ElementSpec,
  ElementSpecByType,
  ElementSpecProps,
  GuiEventHandlers,
} from "./spec"
import { Component, getRegisteredComponentName } from "./component"
import { EventHandlerTags, GuiEventName } from "./guievents"
import { FuncRef } from "../funcRef"

type JsxChildren = AnySpec | false | (AnySpec | false | (AnySpec | false)[])[]

type IntrinsicElement<
  Element extends BaseGuiElement,
  AddSpec extends BaseAddSpec,
  GuiEvents
> = ElementSpecProps<Element> &
  // props specifically on spec (onCreated, onUpdate, styleMod, children)
  GuiEventHandlers<GuiEvents, Element> & // event handlers for this gui element
  // elementMod (directly as props)
  ModOf<Element> & {
    children?: JsxChildren
  } & ({ updateOnly: true; onCreated?: never } | ({ updateOnly?: false } & Omit<AddSpec, "type" | "index">))

// Union instead of intersection of ModableKeys
type AllModableKeys<T> = T extends infer I ? ModableKeys<I> : never

type AddOnlyKeys = Exclude<
  AllModableKeys<AddSpecByType[GuiElementType]>,
  AllModableKeys<GuiElementByType[GuiElementType]>
>

type BothKeys = {
  [T in GuiElementType]: Extract<Exclude<RequiredKeys<AddSpecByType[T]>, "type">, WritableKeys<GuiElementByType[T]>>
}[GuiElementType]

// Typescript abuse:
const rawElementPropType: Record<AddOnlyKeys, "add"> &
  Record<BothKeys, "addAndElement"> &
  Record<Exclude<keyof ElementSpecProps<any>, "name"> | "children", "spec"> &
  Record<GuiEventName, "guiEvent"> = {
  index: "add",
  achievement: "add",
  chart_player_index: "add",
  column_count: "add",
  decorative: "add",
  direction: "add",
  discrete_slider: "add",
  discrete_values: "add",
  elem_type: "add",
  equipment: "add",
  fluid: "add",
  item: "add",
  "item-group": "add",
  maximum_value: "add",
  minimum_value: "add",
  recipe: "add",
  signal: "add",
  signalId: "add",
  technology: "add",
  tile: "add",
  value_step: "add",

  position: "addAndElement",
  state: "addAndElement",

  // name is special
  updateOnly: "spec",
  ref: "spec",

  styleMod: "spec",
  children: "spec",

  onCreated: "spec",
  onLateCreated: "spec",
  onUpdate: "spec",
  onLateUpdate: "spec",

  onCheckedStateChanged: "guiEvent",
  onClick: "guiEvent",
  onClosed: "guiEvent",
  onConfirmed: "guiEvent",
  onElemChanged: "guiEvent",
  onLocationChanged: "guiEvent",
  onOpened: "guiEvent",
  onSelectedTabChanged: "guiEvent",
  onSelectionStateChanged: "guiEvent",
  onSwitchStateChanged: "guiEvent",
  onTextChanged: "guiEvent",
  onValueChanged: "guiEvent",
}
const elementPropType: PRecord<string, "add" | "addAndElement" | "spec" | "guiEvent"> = rawElementPropType

function createElementSpec(
  type: GuiElementType,
  props: Record<string, unknown> | undefined,
  flattenedChildren: AnySpec[] | undefined
): ElementSpec {
  const spec: Partial<ElementSpecByType[GuiElementType]> = {}
  const creationSpec: Record<string, unknown> = {}
  const elementMod: Record<string, unknown> = {}
  if (props) {
    const guiHandlers: PRecord<string, FuncRef<any>> = {}
    for (const [key, value] of pairs(props)) {
      const specType = elementPropType[key]
      if (specType === undefined) {
        elementMod[key] = value
      } else if (specType === "spec") {
        ;(spec as any)[key] = value
      } else if (specType === "guiEvent") {
        guiHandlers[key] = value as FuncRef<any>
      } else {
        // == add or addAndSpec
        creationSpec[key] = value
        if (specType === "addAndElement") {
          elementMod[key] = value
        }
      }
    }
    if (next(guiHandlers) !== undefined) {
      elementMod.tags = elementMod.tags || {}
      ;(elementMod.tags as EventHandlerTags)["#guiEventHandlers"] = guiHandlers
    }
    spec.name = props.name as string
  }
  spec.creationSpec = creationSpec
  spec.elementMod = elementMod
  spec.type = type
  spec.children = flattenedChildren
  return spec as ElementSpec
}

function createComponentSpec<Props>(
  type: Class<Component<Props>>,
  props: (Props & JSX.IntrinsicAttributes) | undefined,
  semiFlattenedChildren: OneOrMany<AnySpec> | undefined
): ComponentSpec<Props> {
  const theProps: any = props || {}
  theProps.children = semiFlattenedChildren
  const name = theProps.name
  const ref = theProps.ref
  theProps.name = undefined
  theProps.ref = undefined
  return {
    type: getRegisteredComponentName(type) ?? error(`The component of class name "${type?.name}" is not registered!`),
    name,
    ref,
    props: theProps,
  }
}

function flattenChildren(children: JsxChildren | undefined, alwaysAsArray: true): AnySpec[] | undefined
function flattenChildren(children: JsxChildren | undefined, alwaysAsArray: false): AnySpec[] | AnySpec | undefined
function flattenChildren(children: JsxChildren | undefined, alwaysAsArray: boolean): AnySpec[] | AnySpec | undefined {
  if (!children) return undefined
  if (!Array.isArray(children)) return alwaysAsArray ? [children] : children
  const result: AnySpec[] = []
  for (const elem of children) {
    if (!elem) continue
    if (Array.isArray(elem)) {
      for (const spec of elem) {
        if (spec) result[result.length] = spec
      }
    } else {
      result[result.length] = elem
    }
  }
  return result.length === 0 ? undefined : !alwaysAsArray && result.length === 1 ? result[0] : result
}

const typeFunc = type

// noinspection JSUnusedGlobalSymbols
export function createElement<Type extends GuiElementType>(
  type: Type,
  props: JSX.IntrinsicElements[Type],
  children?: JsxChildren
): ElementSpecByType[Type]
// noinspection JSUnusedGlobalSymbols
export function createElement(type: "blank", props?: { name?: string }, children?: JsxChildren): BlankSpec
// noinspection JSUnusedGlobalSymbols
export function createElement<Props>(
  type: Class<Component<Props>>,
  props: Props,
  children?: JsxChildren
): ComponentSpec<Props>
// noinspection JSUnusedGlobalSymbols
export function createElement<Props>(
  type: (this: unknown, props: Props) => AnySpec,
  props: Props,
  children?: JsxChildren
): AnySpec | undefined
// noinspection JSUnusedGlobalSymbols
export function createElement(
  type: GuiElementType | Class<Component<unknown>> | "blank" | ((this: unknown, props: unknown) => AnySpec | undefined),
  props?: Record<any, any>,
  children?: JsxChildren
): AnySpec | undefined {
  const typeofType = typeFunc(type)
  if (typeofType === "string") {
    if (type === "blank") {
      return {
        type: "blank",
        name: props && props.name,
        children: flattenChildren(children, true),
      } as BlankSpec
    }
    return createElementSpec(type as GuiElementType, props, flattenChildren(children, true))
  } else if (typeofType === "function") {
    props = props || {}
    props.children = flattenChildren(children, false)
    return (type as (this: unknown, props: unknown) => AnySpec | undefined)(props)
  } else if (typeofType === "table") {
    return createComponentSpec(type as Class<Component<unknown>>, props, flattenChildren(children, false))
  } else {
    error(`component of type ${globalThis.type(type)} not supported`)
  }
}

/* eslint-disable */
declare global {
  namespace JSX {
    // noinspection JSUnusedGlobalSymbols
    type Element = AnySpec
    // noinspection JSUnusedGlobalSymbols
    type ElementClass = Component<unknown>

    // noinspection JSUnusedGlobalSymbols
    interface ElementChildrenAttribute {
      children: {}
    }

    // noinspection JSUnusedGlobalSymbols
    interface ElementAttributesProperty {
      props: {}
    }

    type IntrinsicAttributes = {
      name?: string
      ref?: string | number
    }

    // noinspection JSUnusedGlobalSymbols
    interface IntrinsicElements {
      "choose-elem-button": IntrinsicElement<
        ChooseElemButtonGuiElement,
        ChooseElemButtonAddSpec,
        ChooseElemButtonEvents
      >
      "drop-down": IntrinsicElement<DropDownGuiElement, DropDownAddSpec, DropDownEvents>
      "empty-widget": IntrinsicElement<EmptyWidgetGuiElement, EmptyWidgetAddSpec, EmptyWidgetEvents>
      "entity-preview": IntrinsicElement<EntityPreviewGuiElement, EntityPreviewAddSpec, EntityPreviewEvents>
      "list-box": IntrinsicElement<ListBoxGuiElement, ListBoxAddSpec, ListBoxEvents>
      "scroll-pane": IntrinsicElement<ScrollPaneGuiElement, ScrollPaneAddSpec, ScrollPaneEvents>
      "sprite-button": IntrinsicElement<SpriteButtonGuiElement, SpriteButtonAddSpec, SpriteButtonEvents>
      "tabbed-pane": IntrinsicElement<TabbedPaneGuiElement, TabbedPaneAddSpec, TabbedPaneEvents>
      "text-box": IntrinsicElement<TextBoxGuiElement, TextBoxAddSpec, TextBoxEvents>
      button: IntrinsicElement<ButtonGuiElement, ButtonAddSpec, ButtonEvents>
      camera: IntrinsicElement<CameraGuiElement, CameraAddSpec, CameraEvents>
      checkbox: IntrinsicElement<CheckboxGuiElement, CheckboxAddSpec, CheckboxEvents>
      flow: IntrinsicElement<FlowGuiElement, FlowAddSpec, FlowEvents>
      frame: IntrinsicElement<FrameGuiElement, FrameAddSpec, FrameEvents>
      label: IntrinsicElement<LabelGuiElement, LabelAddSpec, LabelEvents>
      line: IntrinsicElement<LineGuiElement, LineAddSpec, LineEvents>
      minimap: IntrinsicElement<MinimapGuiElement, MinimapAddSpec, MinimapEvents>
      progressbar: IntrinsicElement<ProgressbarGuiElement, ProgressbarAddSpec, ProgressbarEvents>
      radiobutton: IntrinsicElement<RadiobuttonGuiElement, RadiobuttonAddSpec, RadiobuttonEvents>
      slider: IntrinsicElement<SliderGuiElement, SliderAddSpec, SliderEvents>
      sprite: IntrinsicElement<SpriteGuiElement, SpriteAddSpec, SpriteEvents>
      switch: IntrinsicElement<SwitchGuiElement, SwitchAddSpec, SwitchEvents>
      tab: IntrinsicElement<TabGuiElement, TabAddSpec, TabEvents>
      table: IntrinsicElement<TableGuiElement, TableAddSpec, TableEvents>
      textfield: IntrinsicElement<TextfieldGuiElement, TextfieldAddSpec, TextfieldEvents>

      blank: IntrinsicElement<any, any, any>
    }
  }
}
