import { Data } from "DataStage"
import { Colors, GuiConstants, Prototypes, Styles } from "./constants"

declare const data: Data

const inclusionTool = {
  type: "selection-tool",
  name: Prototypes.inclusionTool,
  subgroup: "tool",
  order: "z[bbpp]-[inclusion-tool]",
  icon: "__bbpp__/graphics/icons/inclusion-tool.png",
  icon_size: 32,
  flags: ["spawnable", "only-in-cursor"],
  stack_size: 1,
  stackable: false,
  draw_label_for_cursor_render: true,
  selection_color: Colors.green,
  alt_selection_color: Colors.red,
  selection_mode: ["not-same-force", "enemy", "any-entity"],
  alt_selection_mode: ["not-same-force", "friend", "buildable-type"],

  selection_cursor_box_type: "copy",
  alt_selection_cursor_box_type: "entity",
}
const inclusionToolShortcut = {
  type: "shortcut",
  name: Prototypes.inclusionToolShortcut,
  action: "spawn-item",
  item_to_spawn: Prototypes.inclusionTool,
  order: "m[bbpp]-[inclusion-tool]",
  icon: {
    filename: "__bbpp__/graphics/icons/inclusion-tool.png",
    priority: "extra-high-no-scale",
    flags: ["icon"],
    size: 32,
  },
}
data.extend([inclusionTool, inclusionToolShortcut])

const inclusionFilters = table.deepcopy(data.raw["deconstruction-item"]["deconstruction-planner"])
inclusionFilters.name = Prototypes.inclusionFiltersItem
inclusionFilters.entity_filter_count = Prototypes.inclusionFiltersItemFilterCount
;(inclusionFilters.flags as string[]).push("hidden", "only-in-cursor")
data.extend([inclusionFilters])

const temporaryBlueprint = table.deepcopy(data.raw.blueprint.blueprint)
temporaryBlueprint.name = Prototypes.temporaryBlueprint
;(temporaryBlueprint.flags as string[]).push("hidden", "only-in-cursor")
data.extend([temporaryBlueprint])

const boundaryTile = table.deepcopy(data.raw.tile["lab-white"])
boundaryTile.name = Prototypes.boundaryTileWhite
boundaryTile.order = "z[other]-d[bbpp]-[boundary]"
boundaryTile.collision_mask = ["ground-tile", "object-layer"]
data.extend([boundaryTile])

function createTileEntity(name: string, collisionMask?: string[]) {
  const labWhite = "__base__/graphics/terrain/lab-tiles/lab-white.png"
  const tileEntity = {
    type: "simple-entity",
    name,
    icon: labWhite,
    icon_size: 32,
    picture: {
      filename: labWhite,
      size: 32,
    },
    collision_box: [
      [-0.49, -0.49],
      [0.49, 0.49],
    ],
    collision_mask: collisionMask,
    flags: ["hidden", "player-creation"],
  }
  const tileEntityItem = {
    // required for blueprinting
    type: "item",
    name,
    icon: labWhite,
    icon_size: 32,
    flags: ["hidden"],
    place_result: name,
    stack_size: 1,
  }

  data.extend([tileEntity, tileEntityItem])
}

createTileEntity(Prototypes.tileEntityWhite)
createTileEntity(Prototypes.etherealTileEntityWhite, [])

/*
const referencePointImage = "__core__/graphics/reference-point.png"
const referencePoint = {
  type: "simple-entity",
  name: Prototypes.referencePoint,
  icon: referencePointImage,
  icon_size: 100,
  picture: {
    filename: referencePointImage,
    size: 100,
    scale: 64 / 100,
    shift: [0, -0.1],
  },
  selection_box: [
    [-0.5, -0.5],
    [0.5, 0.5],
  ],
  collision_box: [
    [-0.3, -0.3],
    [0.3, 0.3],
  ],
  collision_mask: ["doodad-layer"],
  flags: ["hidden", "not-selectable-in-game", "placeable-off-grid", "player-creation"],
}
const referencePointItem = {
  // required for blueprinting
  type: "item",
  name: Prototypes.referencePoint,
  icon: referencePointImage,
  icon_size: 100,
  flags: ["hidden"],
  place_result: Prototypes.referencePoint,
  stack_size: 1,
}
*/

const confirmInput = {
  type: "custom-input",
  name: Prototypes.guiConfirmInput,
  key_sequence: "",
  linked_game_control: "confirm-gui",
}
data.extend([confirmInput])

const columnWidths = [
  GuiConstants.Inclusions.moveButtonsWidth,
  GuiConstants.Inclusions.nameWidth,
  GuiConstants.Inclusions.checkboxWidth,
  GuiConstants.Inclusions.inclusionModeSelectionWidth,
  GuiConstants.Inclusions.smallButtonWidth,
  GuiConstants.Inclusions.smallButtonWidth,
]

const columnAlignments = []
for (const i of $range(1, columnWidths.length)) {
  columnAlignments[columnAlignments.length] = {
    column: i,
    alignment: "center",
  }
}
data.raw["gui-style"].default[Styles.inclusionsTable] = {
  type: "table_style",
  parent: "bordered_table",
  cell_padding: 1,
  column_widths: columnWidths.map((val, index) => ({
    column: index + 1,
    width: val,
  })),
  column_alignments: columnAlignments,
}

data.raw["gui-style"].default[Styles.moveButton] = {
  type: "button_style",
  parent: "button",
  width: GuiConstants.Inclusions.moveButtonsWidth,
  height: 15,
  padding: 0,
  font: "default",
}
