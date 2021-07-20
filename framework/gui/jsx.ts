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
import { Component, getComponentName } from "./component"
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

// Typescript abuse:
const rawElementPropType: Record<
  // Properties in AddSpec but not in LuaGuiElement
  Exclude<AllModableKeys<AddSpecByType[GuiElementType]>, AllModableKeys<GuiElementByType[GuiElementType]>>,
  "creation"
> &
  // props for in ElementSpec
  Record<Exclude<keyof ElementSpecProps<any>, "name"> | "children", "spec"> &
  // GUI event names
  Record<GuiEventName, "guiEvent"> = {
  index: "creation",
  achievement: "creation",
  chart_player_index: "creation",
  column_count: "creation",
  decorative: "creation",
  direction: "creation",
  discrete_slider: "creation",
  discrete_values: "creation",
  elem_type: "creation",
  equipment: "creation",
  fluid: "creation",
  item: "creation",
  "item-group": "creation",
  maximum_value: "creation",
  minimum_value: "creation",
  recipe: "creation",
  signal: "creation",
  signalId: "creation",
  technology: "creation",
  tile: "creation",
  value_step: "creation",

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
const elementPropType: PRecord<string, "creation" | "spec" | "guiEvent"> = rawElementPropType

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
        // == creation
        creationSpec[key] = value
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
  props?: Props & JSX.IntrinsicAttributes,
  flattenedChildren?: (AnySpec | undefined)[]
): ComponentSpec<Props> {
  const theProps: any = props || {}
  theProps.children = flattenedChildren
  return {
    type: getComponentName(type) || error(`The component of class type ${type.constructor.name} is not registered!`),
    props: theProps,
    name: theProps.name,
    updateOnly: theProps.updateOnly,
    ref: theProps.ref,
  }
}

function flattenChildren(children: JsxChildren | undefined): AnySpec[] | undefined {
  if (!children) return undefined
  if (!Array.isArray(children)) return [children]
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
  return result.length === 0 ? undefined : result
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
  const flattenedChildren = flattenChildren(children)
  const typeofType = typeFunc(type)
  if (typeofType === "string") {
    if (type === "blank") {
      return {
        type: "blank",
        name: props && props.name,
        children: flattenedChildren,
      } as BlankSpec
    }
    return createElementSpec(type as GuiElementType, props, flattenedChildren)
  } else if (typeofType === "function") {
    props = props || {}
    props.children = children
    return (type as (this: unknown, props: unknown) => AnySpec | undefined)(props)
  } else if (typeofType === "table") {
    return createComponentSpec(type as Class<Component<unknown>>, props, flattenedChildren)
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
      updateOnly?: boolean
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
