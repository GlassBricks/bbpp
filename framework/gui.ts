import { EventHandlerContainer, registerHandlers } from "./events"

// -- Template --

export type GuiTemplate<TData> = GuiElementSpec &
  CommonGuiTemplateFields<TData> &
  GuiTemplateFields<TData> & {
    name?: never
  }

interface ProcessedGuiTemplate<TData> extends CommonGuiTemplateFields<TData> {
  spec: GuiElementSpec
  children: Record<string, ProcessedGuiTemplate<TData>>
}

interface CommonGuiTemplateFields<TData> {
  onCreated?: (this: LuaGuiElement, data: TData) => void
  onUpdate?: (
    this: LuaGuiElement,
    data: TData,
    component: GuiComponent<TData>
  ) => void
}

type GuiTemplateFields<TData> = {
  readonly children?: Record<string, GuiTemplate<TData>>
  onAction?: GuiEventHandler<TData>
} & {
  [n in GuiEventName]?: GuiEventHandler<TData>
}

export type GuiEventHandler<TData> = (
  this: LuaGuiElement,
  event: GuiEventPayload,
  component: GuiComponent<TData>
) => void
// Typescript hack to make sure all fields are done, and correctly
const templateFieldsRaw: Required<
  {
    [K in keyof CommonGuiTemplateFields<any>]: true
  } &
    {
      [K in keyof GuiTemplateFields<any>]: false
    }
> = {
  children: false,
  onAction: false,
  onCreated: true,
  onUpdate: true,
  on_gui_checked_state_changed: false,
  on_gui_click: false,
  on_gui_closed: false,
  on_gui_confirmed: false,
  on_gui_elem_changed: false,
  on_gui_location_changed: false,
  on_gui_opened: false,
  on_gui_selected_tab_changed: false,
  on_gui_selection_state_changed: false,
  on_gui_switch_state_changed: false,
  on_gui_text_changed: false,
  on_gui_value_changed: false,
}
const templateFields: PRecord<string, boolean> = templateFieldsRaw

function isCommonTemplateField(
  k: string
): k is keyof CommonGuiTemplateFields<any> {
  return templateFields[k] === true
}

function isTemplateField(k: string): k is keyof GuiTemplateFields<any> {
  return templateFields[k] === false
}

// -- component --

const guiComponents: Record<string, GuiComponentInternal<any>> = {}

declare global {
  interface Tags {
    "#componentInfo"?: {
      /** the component this is part of */
      componentName: string
      /** the path of this rootElement, from root.
       * Uniquely identifies rootElement in component.
       */
      path: string
      /** the depth of this rootElement. Root has depth 0. */
      depth: number
    }
  }
}

/**
 * A gui component. Use addTo to add an instance.
 */
export interface GuiComponent<TData> {
  readonly componentName: string

  addTo(parent: LuaGuiElement, name: string | null, data: TData): LuaGuiElement

  update(elementOfComponent: LuaGuiElement, data: TData): void
}

/**
 * Declares a gui component with the given [template].
 *
 * A mod-wide unique [componentName] must be given.
 */
export function GuiComponent<TData>(
  componentName: string,
  template: GuiTemplate<TData>
): GuiComponent<TData> {
  return new GuiComponentInternal(componentName, template)
}

class GuiComponentInternal<TData> implements GuiComponent<TData> {
  // actionHandlers[path][guiEventName] = handler
  readonly actionHandlers: Record<
    string,
    Record<string, GuiEventHandler<TData>>
  > = {}

  private readonly template: ProcessedGuiTemplate<TData>

  constructor(
    public readonly componentName: string,
    template: GuiTemplate<TData>
  ) {
    if (guiComponents[componentName]) {
      throw `Component with name ${componentName} already exists`
    }
    guiComponents[componentName] = this

    this.template = this.processTemplate(template, 0, undefined, "")
  }

  private processTemplate(
    template: GuiTemplate<TData>,
    depth: number,
    elementName: string | undefined,
    path: string
  ): ProcessedGuiTemplate<TData> {
    const result: Partial<ProcessedGuiTemplate<TData>> = {}
    const spec: Partial<GuiElementSpec> = {}
    // copy (some) fields of template
    for (const [key, value] of pairs(template)) {
      if (isCommonTemplateField(key)) {
        result[key] = value
      } else if (!isTemplateField(key)) {
        ;(spec as any)[key] = value
      }
    }
    // record handlers
    for (const guiEvent of guiEvents) {
      const handler = template[guiEvent]
      if (handler) {
        this.recordHandler(path, guiEvent, handler)
      }
    }
    if (template.onAction) {
      const eventName = onActionEvents[template.type]
      if (!eventName) {
        throw `GUI element of type ${template.type} does not have an onAction event`
      }
      this.recordHandler(path, eventName, template.onAction)
    }

    spec.name = elementName
    spec.tags = spec.tags || {}
    const tags = spec.tags
    tags["#componentInfo"] = {
      componentName: this.componentName,
      depth,
      path,
    }

    const children: ProcessedGuiTemplate<TData>["children"] = {}
    if (template.children) {
      for (const [childName, childTemplate] of pairs(template.children)) {
        children[childName] = this.processTemplate(
          childTemplate,
          depth + 1,
          childName,
          path + "." + childName
        )
      }
    }

    result.spec = spec as GuiElementSpec
    result.children = children
    return result as ProcessedGuiTemplate<TData>
  }

  private recordHandler(
    path: string,
    eventName: GuiEventName,
    handler: GuiEventHandler<any>
  ) {
    if (!this.actionHandlers[path]) this.actionHandlers[path] = {}
    if (this.actionHandlers[path][eventName]) {
      // TODO: multiple handlers allowed?
      throw `Element ${this.componentName}${path} already has an event handler for ${eventName}.
      (did you do include both onAction and ${eventName}?)`
    }
    this.actionHandlers[path][eventName] = handler
  }

  addTo(
    parent: LuaGuiElement,
    name: string | null,
    data: TData
  ): LuaGuiElement {
    const element = GuiComponentInternal.createRecursive(
      parent,
      name,
      this.template,
      data
    )
    this.update(element, data)
    return element
  }

  private static createRecursive<TData>(
    parent: LuaGuiElement,
    name: string | null,
    template: ProcessedGuiTemplate<TData>,
    data: TData
  ): LuaGuiElement {
    const spec = template.spec
    spec.name = name || undefined // ugly mutation, I know, but it works

    const element = parent.add(spec)
    if (template.onCreated) {
      template.onCreated.call(element, data)
    }
    if (template.children) {
      for (const [childName, childTemplate] of pairs(template.children)) {
        this.createRecursive(element, childName, childTemplate, data)
      }
    }
    return element
  }

  update(element: LuaGuiElement, data: TData) {
    const componentInfo = element.tags["#componentInfo"]
    if (!componentInfo || componentInfo.componentName !== this.componentName) {
      error("Element is not part of this component")
    }
    let root = element
    for (let i = 0; i < componentInfo.depth; i++) {
      root = root.parent
    }
    this.doUpdate(root, this.template, 0, data)
  }

  private doUpdate(
    element: LuaGuiElement,
    template: ProcessedGuiTemplate<TData>,
    depth: number,
    data: TData
  ) {
    const componentInfo = element.tags["#componentInfo"]
    assert(
      componentInfo &&
        componentInfo.componentName === this.componentName &&
        componentInfo.depth === depth
    )
    if (template.onUpdate) {
      template.onUpdate.call(element, data, this)
    }
    for (const child of element.children) {
      const childInfo = child.tags["#componentInfo"]
      if (childInfo && childInfo.depth === depth + 1) {
        const childTemplate = template.children[child.name]
        this.doUpdate(child, childTemplate, depth + 1, data)
      }
    }
  }
}

// -- GUI events --

const guiEvents = [
  "on_gui_checked_state_changed",
  "on_gui_click",
  "on_gui_closed",
  "on_gui_confirmed",
  "on_gui_elem_changed",
  "on_gui_location_changed",
  "on_gui_opened",
  "on_gui_selected_tab_changed",
  "on_gui_selection_state_changed",
  "on_gui_switch_state_changed",
  "on_gui_text_changed",
  "on_gui_value_changed",
] as const

type GuiEventName = typeof guiEvents[number]

const onActionEvents: PRecord<GuiElementType, GuiEventName> = {
  checkbox: "on_gui_checked_state_changed",
  "choose-elem-button": "on_gui_elem_changed",
  button: "on_gui_click",
  "sprite-button": "on_gui_click",
  "drop-down": "on_gui_selection_state_changed",
  textfield: "on_gui_text_changed",
  "text-box": "on_gui_text_changed",
  slider: "on_gui_value_changed",
  switch: "on_gui_switch_state_changed",
}

// some events may have more fields
export declare interface GuiEventPayload {
  element: LuaGuiElement
  // eslint-disable-next-line camelcase
  player_index: number
}

function handleGuiEvent(eventName: GuiEventName, event: GuiEventPayload) {
  const element = event.element
  if (!element) return
  const elementInfo = element.tags["#componentInfo"]
  if (!elementInfo) return
  const component = guiComponents[elementInfo.componentName]
  const path = elementInfo.path
  const handlers = component.actionHandlers[path]
  if (!handlers) return
  const handler = handlers[eventName]
  if (handler) {
    handler.call(element, event, component)
  }
}

const handlers: EventHandlerContainer = {}
for (const guiEvent of guiEvents) {
  handlers[guiEvent] = (payload) => {
    handleGuiEvent(guiEvent, payload)
  }
}
registerHandlers(handlers)
