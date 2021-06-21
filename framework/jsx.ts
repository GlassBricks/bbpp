import { ElementSpec, FC, FCSpec, LuaElementSpec, LuaElementSpecOfType, LuaElementSpecProps } from "./gui"

type PrependCreated<T> = {
  [K in keyof T as K extends string ? `created_${K}` : never]: T[K]
}

type IntrinsicElement<Element extends BaseGuiElement, Spec extends BaseGuiSpec> = LuaElementSpecProps<Element> &
  PrependCreated<Omit<Spec, "type" | "index">> &
  ModOf<Element> & {
    children?: ElementSpec | ElementSpec[]
  }

// Props which are NOT elementMod or creationMod
const extraProps: Record<
  keyof LuaElementSpecProps<any> | keyof JSX.IntrinsicAttributes | keyof JSX.ElementChildrenAttribute,
  true
> = {
  key: true,
  shouldUpdate: true,

  styleMod: true,
  children: true,

  onCreated: true,
  onUpdate: true,

  onAction: true,
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
  props: IntrinsicElement<any, any>,
  flattenedChildren: ElementSpec[] | undefined
): LuaElementSpec {
  const result: Partial<LuaElementSpecOfType<any>> = {}
  const creationSpec: Record<string, unknown> = {}
  const elementMod: Record<string, unknown> = {}
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
  return result as LuaElementSpec
}

function createFunctionalComponent<T>(
  type: FC<T>,
  props: T & JSX.IntrinsicAttributes,
  flattenedChildren: ElementSpec[] | undefined
): FCSpec<T> {
  return {
    type,
    props: { ...props, children: flattenedChildren },
    shouldUpdate: props.shouldUpdate,
    key: props.key,
  }
}

function flattenChildren(children: Children | undefined): ElementSpec[] | undefined {
  if (!children) return undefined
  if (!Array.isArray(children)) return [children]
  const result: ElementSpec[] = []
  for (const elem of children) {
    if (elem === undefined) continue
    if (Array.isArray(elem)) {
      for (const template of elem) {
        result[result.length] = template
      }
    } else {
      result[result.length] = elem
    }
  }
  return result.length === 0 ? undefined : result
}

type Children = ElementSpec | (ElementSpec | ElementSpec[] | undefined)[]

function createComponent<Type extends GuiElementType>(
  this: void,
  type: Type,
  props: IntrinsicElement<GuiElementOfType<Type>, GuiSpecOfType<Type>>,
  children?: Children
): LuaElementSpecOfType<Type>
function createComponent<T>(
  this: void,
  type: FC<T>,
  props: T & Partial<JSX.IntrinsicAttributes>,
  children?: Children
): FCSpec<T>
function createComponent(
  this: void,
  type: GuiElementType | FC<unknown>,
  props?: Record<any, unknown>,
  children?: Children
): ElementSpec | LuaElementSpecOfType<any> {
  props = props || {}
  const flattenedChildren = flattenChildren(children)
  if (typeof type === "string") {
    return createElementComponent(type, props, flattenedChildren)
  } else {
    return createFunctionalComponent(type, props, flattenedChildren)
  }
}

export default createComponent

/* eslint-disable */
declare global {
  namespace JSX {
    type Element = ElementSpec
    type ElementClass = never

    interface ElementChildrenAttribute {
      children: {}
    }

    interface IntrinsicAttributes {
      key?: string
      shouldUpdate?: boolean
    }

    interface IntrinsicElements {
      "choose-elem-button": IntrinsicElement<ChooseElemButtonGuiElement, ChooseElemButtonGuiSpec>
      "drop-down": IntrinsicElement<DropDownGuiElement, DropDownGuiSpec>
      "empty-widget": IntrinsicElement<EmptyWidgetGuiElement, EmptyWidgetGuiSpec>
      "entity-preview": IntrinsicElement<EntityPreviewGuiElement, EntityPreviewGuiSpec>
      "list-box": IntrinsicElement<ListBoxGuiElement, ListBoxGuiSpec>
      "scroll-pane": IntrinsicElement<ScrollPaneGuiElement, ScrollPaneGuiSpec>
      "sprite-button": IntrinsicElement<SpriteButtonGuiElement, SpriteButtonGuiSpec>
      "tabbed-pane": IntrinsicElement<TabbedPaneGuiElement, TabbedPaneGuiSpec>
      "text-box": IntrinsicElement<TextBoxGuiElement, TextBoxGuiSpec>
      button: IntrinsicElement<ButtonGuiElement, ButtonGuiSpec>
      camera: IntrinsicElement<CameraGuiElement, CameraGuiSpec>
      checkbox: IntrinsicElement<CheckboxGuiElement, CheckboxGuiSpec>
      flow: IntrinsicElement<FlowGuiElement, FlowGuiSpec>
      frame: IntrinsicElement<FrameGuiElement, FrameGuiSpec>
      label: IntrinsicElement<LabelGuiElement, LabelGuiSpec>
      line: IntrinsicElement<LineGuiElement, LineGuiSpec>
      minimap: IntrinsicElement<MinimapGuiElement, MinimapGuiSpec>
      progressbar: IntrinsicElement<ProgressbarGuiElement, ProgressbarGuiSpec>
      radiobutton: IntrinsicElement<RadiobuttonGuiElement, RadiobuttonGuiSpec>
      slider: IntrinsicElement<SliderGuiElement, SliderGuiSpec>
      sprite: IntrinsicElement<SpriteGuiElement, SpriteGuiSpec>
      switch: IntrinsicElement<SwitchGuiElement, SwitchGuiSpec>
      tab: IntrinsicElement<TabGuiElement, TabGuiSpec>
      table: IntrinsicElement<TableGuiElement, TableGuiSpec>
      textfield: IntrinsicElement<TextfieldGuiElement, TextfieldGuiSpec>
    }
  }
}
