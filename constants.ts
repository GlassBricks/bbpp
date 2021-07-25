export const Prototypes = {
  boundaryTileWhite: "bbpp:boundary-tile-white",

  temporaryBlueprint: "bbpp:temporary-blueprint",
  tileEntityWhite: "bbpp:tile-entity-white",
  etherealTileEntityWhite: "bbpp:ethereal-tile-entity-white",
  // referencePoint: "bbpp:reference-point",

  inclusionTool: "bbpp:inclusion-tool",
  inclusionToolShortcut: "bbpp:inclusion-tool-shortcut",

  inclusionFiltersItem: "bbpp:inclusion-filters-item",
  inclusionFiltersItemFilterCount: 50,

  guiConfirmInput: "bbpp:confirm-gui-linked" as CustomInputName,
} as const
export const Styles = {
  inclusionsTable: "bbpp:inclusions-table",
  moveButton: "bbpp:move-button",
} as const

export const GuiConstants = {
  windowWidth: 500,

  areaListWidth: 300,
  areaListHeight: 300,

  Inclusions: {
    moveButtonsWidth: 20,
    nameWidth: 200,
    inclusionModeSelectionWidth: 80,
    checkboxWidth: 30,
    smallButtonWidth: 24,
  },
} as const
// todo: find actual game colors
export const Colors = {
  red: { r: 244, g: 85, b: 85 } as Color,
  green: { r: 155, g: 244, b: 122 } as Color,
  yellow: { r: 255, g: 204, b: 20 } as Color,
}
