import { EventName, PayloadOf } from "../events"
import { guiEventNameMapping } from "./guievents"
import { Component } from "./component"

type ReverseGuiEventNameMapping = {
  [P in keyof typeof guiEventNameMapping as typeof guiEventNameMapping[P]]: P
}
type FlexiblePayloadOf<T> = T extends EventName ? PayloadOf<T> : never

type GuiEventHandlers<Type extends GuiElementType, Events> = {
  [N in Events as N extends keyof ReverseGuiEventNameMapping ? ReverseGuiEventNameMapping[N] : never]?: (
    element: GuiElementByType[Type],
    payload: FlexiblePayloadOf<N>
  ) => void
}

type MergeKeys<T> = T extends infer I ? keyof I : never // union of keys instead of intersection of keys
// This type is separate from LuaElementSpecOfType as it is used by jsx defs
export type ElementSpecProps<Type extends GuiElementType> = {
  onCreated?: (element: GuiElementByType[Type]) => void
  onUpdate?: (element: GuiElementByType[Type]) => void

  styleMod?: ModOf<LuaStyle>
  key?: string
}

export type ElementSpecOfType<Type extends GuiElementType> = ElementSpecProps<Type> &
  GuiEventHandlers<Type, keyof GuiEventsByType[Type]> & {
    creationSpec: Omit<GuiSpecByType[Type], "type" | "index">
    elementMod?: ModOf<GuiElementByType[Type]>
    children?: AnySpec[]
    type: Type
  }

export type ElementSpec = {
  [T in GuiElementType]: ElementSpecOfType<T>
}[GuiElementType]
// FC
export type FC<Props = Record<string, never>> = (props: Props) => AnySpec
export type FCSpec<Props> = {
  type: FC<Props>
  props: Props
  key?: string
}
export type ComponentSpec<Props> = {
  type: Class<Component<Props>>
  props: Props
  key?: string
}
export type AnySpec = ElementSpec | FCSpec<any> | ComponentSpec<any>
