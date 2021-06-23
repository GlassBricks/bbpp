import { AnySpec, ElementSpec, ElementSpecOfType, ElementSpecProps, FC, FCSpec, GuiEventHandlers } from "./spec"
import { Component } from "./component"
import { EventHandlerTags, GuiEventName } from "./guievents"
import { isRegisteredFunc } from "../funcRef"

type CreationMod<T> = {
  [K in keyof T as K extends string ? `_${K}` : never]: T[K]
}

type IntrinsicElement<Type extends GuiElementType> = ElementSpecProps<Type> &
  GuiEventHandlers<Type, keyof GuiEventsByType[Type]> &
  CreationMod<Omit<GuiSpecByType[Type], "type" | "index">> &
  ModOf<GuiElementByType[Type]> & {
    children?: AnySpec | AnySpec[]
  }

// Props which are NOT elementMod or creationMod
const specProps: Record<
  keyof ElementSpecProps<GuiElementType> | keyof JSX.IntrinsicAttributes | keyof JSX.ElementChildrenAttribute,
  true
> = {
  key: true,

  styleMod: true,
  children: true,

  onCreated: true,
  onUpdate: true,
}
export const guiHandlerProps: Record<GuiEventName, true> = {
  onCheckedStateChanged: true,
  onClick: true,
  onClosed: true,
  onConfirmed: true,
  onElemChanged: true,
  onLocationChanged: true,
  onOpened: true,
  onSelectedTabChanged: true,
  onSelectionStateChanged: true,
  onSwitchStateChanged: true,
  onTextChanged: true,
  onValueChanged: true,
}

function getFuncName(func: Function, debugName: string): string {
  if (!isRegisteredFunc(func)) error(`The function for ${debugName} was not a registered function ref`)
  return func.funcName
}

const sub = string.sub

function createElementSpec(
  type: GuiElementType,
  props: Record<string, unknown> | undefined,
  flattenedChildren: AnySpec[] | undefined
): ElementSpec {
  const result: Partial<ElementSpecOfType<any>> = {}
  const creationSpec: Record<string, unknown> = {}
  const elementMod: Record<string, unknown> = {}
  if (props) {
    const guiHandlers: PRecord<string, string> = {}
    for (const [key, value] of pairs(props)) {
      if (key in specProps) {
        ;(result as any)[key] = value
      } else if (key in guiHandlerProps) {
        guiHandlers[key] = getFuncName(value as Function, key)
      } else if (sub(key, 1, 1) === "_") {
        creationSpec[sub(key, 2)] = value
      } else {
        elementMod[key] = value
      }
    }
    props.tags = props.tags || {}
    ;(props.tags as EventHandlerTags)["#guiEventHandlers"] = guiHandlers
  }
  result.creationSpec = creationSpec
  result.elementMod = elementMod
  result.type = type
  result.children = flattenedChildren
  return result as ElementSpec
}

function createFCSpec<T>(
  type: FC<T>,
  props: (T & JSX.IntrinsicAttributes) | undefined,
  flattenedChildren: AnySpec[] | undefined
): FCSpec<T> {
  const theProps: any = props || {}
  theProps.children = flattenedChildren
  return {
    type,
    props: theProps,
    key: theProps.key,
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

type Children = AnySpec | (AnySpec | AnySpec[])[]

export function createElement<Type extends GuiElementType>(
  this: void,
  type: Type,
  props: IntrinsicElement<Type>,
  children?: Children
): ElementSpecOfType<Type>
export function createElement<T>(
  this: void,
  type: FC<T>,
  props: T & JSX.IntrinsicAttributes,
  children?: Children
): FCSpec<T>
export function createElement(
  this: void,
  type: GuiElementType | FC<unknown>,
  props?: Record<any, any>,
  children?: Children
): AnySpec {
  const flattenedChildren = flattenChildren(children)
  if (typeof type === "string") {
    return createElementSpec(type, props, flattenedChildren)
  } else {
    return createFCSpec(type, props, flattenedChildren)
  }
}

/* eslint-disable */
declare global {
  namespace JSX {
    type Element = AnySpec
    type ElementClass = Component<any>

    interface ElementChildrenAttribute {
      children: {}
    }

    interface ElementAttributesProperty {
      props: {}
    }

    interface IntrinsicAttributes {
      key?: string
    }

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
