import { Data } from "DataStage"
import { Prototypes } from "./constants"

declare const data: Data

const boundaryTile = table.deepcopy(data.raw.tile["lab-white"])
boundaryTile.name = Prototypes.boundaryTileWhite
boundaryTile.order = "z[other]-d[bbpp]-[boundary]"
boundaryTile.collision_mask = ["ground-tile", "object-layer"]

data.extend([boundaryTile])

const inclusionTool = {
  type: "selection-tool",
  name: Prototypes.inclusionTool,
  subgroup: "tool",
  order: "z[bbpp]-[inclusion-tool]",
  icon: "__bbpp__/graphics/icons/inclusion-tool.png",
  icon_size: 32,
  flags: ["spawnable"],
  stack_size: 1,
  stackable: false,
  draw_label_for_cursor_render: true,
  selection_color: {
    r: 155,
    g: 244,
    b: 122,
  },
  alt_selection_color: {
    r: 244,
    g: 85,
    b: 85,
  },
  selection_mode: ["buildable-type", "enemy", "not-same-force"],
  alt_selection_mode: ["buildable-type", "friend", "not-same-force"],
  selection_cursor_box_type: "entity",
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
    flags: ["icon"],
    size: 32,
  },
}

data.extend([inclusionTool, inclusionToolShortcut])

const confirmInput = {
  type: "custom-input",
  name: Prototypes.guiConfirmInput,
  key_sequence: "",
  linked_game_control: "confirm-gui",
}
data.extend([confirmInput])
