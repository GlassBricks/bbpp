import { EmptyWidgetElementSpec } from "../spec"

const horizontalSpacer: EmptyWidgetElementSpec = {
  type: "empty-widget",
  styleMod: {
    horizontally_stretchable: true,
  },
}

export function HorizontalSpacer(): EmptyWidgetElementSpec {
  return horizontalSpacer
}
