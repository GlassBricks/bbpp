import {
  AnySpec,
  ComponentSpec,
  ElementSpec,
  ElementSpecOfType,
  ElementSpecProps,
  GuiEventHandlers,
  NonNilSpec,
} from "./spec"
import { Component } from "./component"
import { EventHandlerTags, GuiEventName } from "./guievents"
import { isRegisteredFunc } from "../funcRef"

type IntrinsicElement<Type extends GuiElementType> = ElementSpecProps<Type> &
  GuiEventHandlers<Type, keyof GuiEventsByType[Type]> &
  ModOf<GuiElementByType[Type]> & {
    children?: NonNilSpec | NonNilSpec[]
  } & (
    | { updateOnly: true; onCreated?: undefined }
    | ({ updateOnly?: false } & Omit<GuiSpecByType[Type], "type" | "index">)
  )
// Union instead of intersection of keys
type AllModableKeys<T> = T extends infer I ? ModableKeys<I> : never
// Typescript abuse
const rawElementPropType: Record<
  // Props in GuiElementSpec but not in LuaGuiElement
  Exclude<AllModableKeys<GuiSpecByType[GuiElementType]>, AllModableKeys<GuiElementByType[GuiElementType]>>,
  "creation"
> &
  // props only in CreationSpec
  Record<keyof ElementSpecProps<any> | keyof JSX.IntrinsicAttributes | keyof JSX.ElementChildrenAttribute, "spec"> &
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
  items: "creation",
  maximum_value: "creation",
  minimum_value: "creation",
  recipe: "creation",
  signal: "creation",
  signalId: "creation",
  technology: "creation",
  tile: "creation",
  value_step: "creation",

  key: "spec",
  updateOnly: "spec",

  styleMod: "spec",
  children: "spec",

  onCreated: "spec",
  onUpdate: "spec",

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

function getFuncName(func: Function, debugName: string): string {
  if (!isRegisteredFunc(func)) error(`The function for ${debugName} was not a registered function ref`)
  return func.funcName
}

function createElementSpec(
  type: GuiElementType,
  props: Record<string, unknown> | undefined,
  flattenedChildren: NonNilSpec[] | undefined
): ElementSpec {
  const spec: Partial<ElementSpecOfType<any>> = {}
  const creationSpec: Record<string, unknown> = {}
  const elementMod: Record<string, unknown> = {}
  if (props) {
    const guiHandlers: PRecord<string, string> = {}
    for (const [key, value] of pairs(props)) {
      const specType = elementPropType[key]
      if (specType === undefined) {
        elementMod[key] = value
      } else if (specType === "spec") {
        ;(spec as any)[key] = value
      } else if (specType === "guiEvent") {
        guiHandlers[key] = getFuncName(value as Function, key)
      } else {
        // == creation
        creationSpec[key] = value
      }
    }
    if (next(guiHandlers) !== undefined) {
      elementMod.tags = elementMod.tags || {}
      ;(elementMod.tags as EventHandlerTags)["#guiEventHandlers"] = guiHandlers
    }
  }
  spec.creationSpec = creationSpec
  spec.elementMod = elementMod
  spec.type = type
  spec.children = flattenedChildren
  return spec as ElementSpec
}

function createComponentSpec<T>(
  type: Class<Component<T>>,
  props?: T & JSX.IntrinsicAttributes & { deferProps?: boolean },
  flattenedChildren?: AnySpec[]
): ComponentSpec<T> {
  const theProps: any = props || {}
  theProps.children = flattenedChildren
  return {
    type: type.name,
    props: theProps,
    key: theProps.key,
    updateOnly: theProps.updateOnly,
    deferProps: theProps.deferProps,
  }
}

function flattenChildren(children: Children | undefined): NonNilSpec[] | undefined {
  if (!children) return undefined
  if ((children as any).type !== undefined) return [children as NonNilSpec]
  const result: NonNilSpec[] = []
  for (const elem of children as any[]) {
    if (elem.type !== undefined) {
      result[result.length] = elem
    } else {
      for (const spec of elem as NonNilSpec[]) {
        result[result.length] = spec
      }
    }
  }
  return result.length === 0 ? undefined : result
}

type Children = AnySpec | (AnySpec | AnySpec[])[]
const typeFunc = type

export function createElement<Type extends GuiElementType>(
  this: void,
  type: Type,
  props: IntrinsicElement<Type>,
  children: Children
): ElementSpecOfType<Type>
export function createElement<Props>(
  this: void,
  type: Class<Component<Props>>,
  props: Props,
  children: Children
): ComponentSpec<Props>
export function createElement(
  this: void,
  type: GuiElementType | Class<Component<any>>,
  props?: Record<any, any>,
  children?: Children
): AnySpec {
  const flattenedChildren = flattenChildren(children)
  const typeofType = typeFunc(type)
  if (typeofType === "string") {
    return createElementSpec(type as GuiElementType, props, flattenedChildren)
  } else if (typeofType === "table") {
    return createComponentSpec(type as Class<Component<any>>, props, flattenedChildren)
  } else {
    error(`component of type ${typeofType} not supported`)
  }
}

/* eslint-disable */
declare global {
  namespace JSX {
    // noinspection JSUnusedGlobalSymbols
    type Element = NonNilSpec
    // noinspection JSUnusedGlobalSymbols
    type ElementClass = Component<any>

    interface ElementChildrenAttribute {
      children: {}
    }

    // noinspection JSUnusedGlobalSymbols
    interface ElementAttributesProperty {
      ____props: {} // type checking only
    }

    type IntrinsicAttributes = {
      key?: string
      updateOnly?: boolean
    }

    // noinspection JSUnusedGlobalSymbols
    interface IntrinsicElements {
      "choose-elem-button": IntrinsicElement<"choose-elem-button">
      "drop-down": IntrinsicElement<"drop-down">
      "empty-widget": IntrinsicElement<"empty-widget">
      "entity-preview": IntrinsicElement<"entity-preview">
      "list-box": IntrinsicElement<"list-box">
      "scroll-pane": IntrinsicElement<"scroll-pane">
      "sprite-button": IntrinsicElement<"sprite-button">
      "tabbed-pane": IntrinsicElement<"tabbed-pane">
      "text-box": IntrinsicElement<"text-box">
      button: IntrinsicElement<"button">
      camera: IntrinsicElement<"camera">
      checkbox: IntrinsicElement<"checkbox">
      flow: IntrinsicElement<"flow">
      frame: IntrinsicElement<"frame">
      label: IntrinsicElement<"label">
      line: IntrinsicElement<"line">
      minimap: IntrinsicElement<"minimap">
      progressbar: IntrinsicElement<"progressbar">
      radiobutton: IntrinsicElement<"radiobutton">
      slider: IntrinsicElement<"slider">
      sprite: IntrinsicElement<"sprite">
      switch: IntrinsicElement<"switch">
      tab: IntrinsicElement<"tab">
      table: IntrinsicElement<"table">
      textfield: IntrinsicElement<"textfield">
    }
  }
}
