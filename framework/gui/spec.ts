import { GameEvents } from "../events"
import { guiEventNameMapping } from "./guievents"
import { ComponentFunc } from "./component"
import { Blank } from "./jsx"

type ReverseGuiEventNameMapping = {
  [P in keyof typeof guiEventNameMapping as typeof guiEventNameMapping[P]]: P
}
type FlexiblePayloadOf<T> = T extends keyof GameEvents ? GameEvents[T]["#payloadType"] : unknown

export type GuiEventHandlers<Type extends GuiElementType> = {
  [N in keyof GuiEventsByType[Type] as N extends keyof ReverseGuiEventNameMapping
    ? ReverseGuiEventNameMapping[N]
    : never]?: ComponentFunc<(element: GuiElementByType[Type], payload: FlexiblePayloadOf<N>) => void>
}

// This type is separate from ElementSpecOfType as it is used by jsx defs
export type ElementSpecProps<Type extends GuiElementType> = JSX.IntrinsicAttributes & {
  onCreated?: (element: GuiElementByType[Type]) => void
  onUpdate?: (element: GuiElementByType[Type]) => void

  styleMod?: ModOf<LuaStyle>
  children?: AnySpec[]
}

export type ElementSpecOfType<Type extends GuiElementType> = ElementSpecProps<Type> &
  GuiEventHandlers<Type> & {
    type: Type
    creationSpec?: Omit<GuiAddSpecByType[Type], "type" | "index">
    elementMod?: ModOf<GuiElementByType[Type]>
  }

export type ElementSpec = {
  [T in GuiElementType]: ElementSpecOfType<T>
}[GuiElementType]

export type BlankSpec = {
  type: typeof Blank
  name?: string
  updateOnly?: true
  children?: AnySpec[]
}

// Component
export type ComponentSpec<Props> = JSX.IntrinsicAttributes & {
  type: string
} & (
    | {
        updateOnly: true
        props?: Partial<Props>
      }
    | {
        updateOnly?: false
        props: Props
      }
  )

export type AnySpec = ElementSpec | ComponentSpec<any> | BlankSpec
