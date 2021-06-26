import { EventName, PayloadOf } from "../events"
import { guiEventNameMapping } from "./guievents"
import { ComponentFunc } from "./component"

type ReverseGuiEventNameMapping = {
  [P in keyof typeof guiEventNameMapping as typeof guiEventNameMapping[P]]: P
}
type FlexiblePayloadOf<T> = T extends EventName ? PayloadOf<T> : never

export type GuiEventHandlers<Type extends GuiElementType, Events> = {
  [N in Events as N extends keyof ReverseGuiEventNameMapping ? ReverseGuiEventNameMapping[N] : never]?: ComponentFunc<
    (element: GuiElementByType[Type], payload: FlexiblePayloadOf<N>) => void
  >
}

// This type is separate from LuaElementSpecOfType as it is used by jsx defs
export type ElementSpecProps<Type extends GuiElementType> = JSX.IntrinsicAttributes & {
  onCreated?: (element: GuiElementByType[Type]) => void
  onUpdate?: (element: GuiElementByType[Type]) => void

  styleMod?: ModOf<LuaStyle>
}

export type ElementSpecOfType<Type extends GuiElementType> = ElementSpecProps<Type> &
  GuiEventHandlers<Type, keyof GuiEventsByType[Type]> & {
    type: Type
    creationSpec?: Omit<GuiSpecByType[Type], "type" | "index">
    elementMod?: ModOf<GuiElementByType[Type]>
    children?: AnySpec[]
  }

export type ElementSpec = {
  [T in GuiElementType]: ElementSpecOfType<T>
}[GuiElementType]

// Component
export type ComponentSpec<Props> = {
  type: string
  key?: string
} & (
  | {
      deferProps: true
      updateOnly?: false
      props: Pick<Props, ReadonlyKeys<Props>>
    }
  | {
      deferProps?: false
      updateOnly: true
      props?: Partial<Props>
    }
  | {
      deferProps?: false
      updateOnly?: false
      props: Props
    }
)

export type AnySpec = ElementSpec | ComponentSpec<any>
