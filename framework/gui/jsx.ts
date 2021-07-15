/** @noSelfInFile */
import {
  AnySpec,
  BlankSpec,
  ComponentSpec,
  ElementSpec,
  ElementSpecOfType,
  ElementSpecProps,
  GuiEventHandlers,
} from "./spec"
import { Component } from "./component"
import { EventHandlerTags, GuiEventName } from "./guievents"
import { FuncRef } from "../funcRef"

type IntrinsicElement<Type extends GuiElementType> = ElementSpecProps<Type> & // props specifically on spec (onCreated, onUpdate, styleMod, children)
  GuiEventHandlers<Type> & // event handlers for this gui element
  // elementMod (directly as props)
  ModOf<GuiElementByType[Type]> & {
    children?: AnySpec | (AnySpec | AnySpec[])[] // children
    // gui add spec, but only if updateOnly is false
  } & (
    | { updateOnly: true; onCreated?: never }
    | ({ updateOnly?: false } & Omit<GuiAddSpecByType[Type], "type" | "index">)
  )

// Union instead of intersection of ModableKeys
type AllModableKeys<T> = T extends infer I ? ModableKeys<I> : never

// Typescript abuse:
const rawElementPropType: Record<
  // Properties in GuiAddSpec but not in LuaGuiElement
  Exclude<AllModableKeys<GuiAddSpecByType[GuiElementType]>, AllModableKeys<GuiElementByType[GuiElementType]>>,
  "creation"
> &
  // props for in ElementSpec
  Record<Exclude<keyof ElementSpecProps<any>, "name">, "spec"> &
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

  // name is special
  updateOnly: "spec",
  ref: "spec",

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

function createElementSpec(
  type: GuiElementType,
  props: Record<string, unknown> | undefined,
  flattenedChildren: AnySpec[] | undefined
): ElementSpec {
  const spec: Partial<ElementSpecOfType<any>> = {}
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
    type: type.name,
    props: theProps,
    name: theProps.name,
    updateOnly: theProps.updateOnly,
    ref: theProps.ref,
  }
}

function flattenChildren(children: Children | undefined): AnySpec[] | undefined {
  if (!children) return undefined
  if ((children as any).type !== undefined) return [children as AnySpec]
  const result: AnySpec[] = []
  for (const elem of children as any[]) {
    if (elem.type !== undefined) {
      result[result.length] = elem
    } else {
      for (const spec of elem as AnySpec[]) {
        result[result.length] = spec
      }
    }
  }
  return result.length === 0 ? undefined : result
}

type Children = AnySpec | undefined | (AnySpec | undefined | (AnySpec | undefined)[])[]

// noinspection JSUnusedGlobalSymbols
export function createElement<Type extends GuiElementType>(
  type: Type,
  props: IntrinsicElement<Type>,
  children: Children
): ElementSpecOfType<Type>
// noinspection JSUnusedGlobalSymbols
export function createElement<Props>(
  type: Class<Component<Props>>,
  props: Props,
  children: Children
): ComponentSpec<Props>
// noinspection JSUnusedGlobalSymbols
export function createElement(
  type: GuiElementType | Class<Component<any>> | "blank",
  props?: Record<any, any>,
  children?: Children
): AnySpec {
  const flattenedChildren = flattenChildren(children)
  if (type === Blank) {
    return {
      type: Blank,
      name: props && props.name,
      children: flattenedChildren,
    } as BlankSpec
  } else if (typeof type === "string") {
    return createElementSpec(type, props, flattenedChildren)
  } else if (typeof type === "object") {
    return createComponentSpec(type, props, flattenedChildren)
  } else {
    error(`component of type ${globalThis.type(type)} not supported`)
  }
}

export const Blank = "blank" as const

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
      ____props: {} // for type checking only; see Component.____props
    }

    type IntrinsicAttributes = {
      name?: string
      updateOnly?: boolean
      ref?: string | number
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

      blank: IntrinsicElement<any>
    }
  }
}
