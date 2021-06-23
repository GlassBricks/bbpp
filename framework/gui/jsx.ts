import { AnySpec, ElementSpec, ElementSpecOfType, ElementSpecProps, FC, FCSpec } from "./spec"
import { Component } from "./component"

type PrependCreated<T> = {
  [K in keyof T as K extends string ? `created_${K}` : never]: T[K]
}

type IntrinsicElement<Type extends GuiElementType> = ElementSpecProps<Type> &
  PrependCreated<Omit<GuiSpecByType[Type], "type" | "index">> &
  ModOf<GuiElementByType[Type]> & {
    children?: AnySpec | AnySpec[]
  }

// Props which are NOT elementMod or creationMod
const extraProps: Record<
  keyof ElementSpecProps<GuiElementType> | keyof JSX.IntrinsicAttributes | keyof JSX.ElementChildrenAttribute,
  true
> = {
  key: true,

  styleMod: true,
  children: true,

  onCreated: true,
  onUpdate: true,

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

function createElementComponent(
  type: GuiElementType,
  props: IntrinsicElement<any> | undefined,
  flattenedChildren: AnySpec[] | undefined
): ElementSpec {
  const result: Partial<ElementSpecOfType<any>> = {}
  const creationSpec: Record<string, unknown> = {}
  const elementMod: Record<string, unknown> = {}
  if (props)
    for (const [k, value] of pairs(props as Record<string, unknown>)) {
      const key = k as string
      if (key in extraProps) {
        // includes intrinsic attributes
        ;(result as any)[key] = value as any
      } else if (key.startsWith("created_")) {
        creationSpec[key.substr(8)] = value
      } else {
        elementMod[key] = value
      }
    }
  result.creationSpec = creationSpec
  result.elementMod = elementMod
  result.type = type
  result.children = flattenedChildren
  return result as ElementSpec
}

function createFunctionalComponent<T>(
  type: FC<T>,
  props: T & JSX.IntrinsicAttributes | undefined,
  flattenedChildren: AnySpec[] | undefined
): FCSpec<T> {
  return {
    type,
    props: { ...props!, children: flattenedChildren },
    key: props && props.key,
  }
}

function flattenChildren(children: Children | undefined): AnySpec[] | undefined {
  if (!children) return undefined
  if (!Array.isArray(children)) return [children]
  const result: AnySpec[] = []
  for (const elem of children) {
    if (elem === undefined) continue
    if (Array.isArray(elem)) {
      for (const spec of elem) {
        result[result.length] = spec
      }
    } else {
      result[result.length] = elem
    }
  }
  return result.length === 0 ? undefined : result
}

type Children = AnySpec | (AnySpec | AnySpec[] | undefined)[]

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
    return createElementComponent(type, props, flattenedChildren)
  } else {
    return createFunctionalComponent(type, props, flattenedChildren)
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
