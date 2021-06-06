import { create, guiFuncs, GuiTemplate, update } from "../framework/gui"
import { PlayerData } from "../framework/playerData"
import { DevButton } from "../framework/devButtons"
import { registerHandlers } from "../framework/events"

interface UggState {
  controlsActive: boolean
  buttonCount: number
  selectedItem?: string

  mainFrame?: LuaGuiElement
}

const guiState = PlayerData<UggState>("guiState2", () => ({
  controlsActive: true,
  buttonCount: 5,
}))

const itemSprites = [
  "inserter",
  "transport-belt",
  "stone-furnace",
  "assembling-machine-3",
  "logistic-chest-storage",
  "sulfur",
  "utility-science-pack",
  "laser-turret",
]

function updateGui(state: UggState) {
  update(state.mainFrame!, template, state)
}

function toggleInterface(player: LuaPlayer) {
  const state = guiState(player.index)
  const frame = state.mainFrame
  if (!frame || !frame.valid) {
    state.mainFrame = create(player.gui.screen, template, state)
  } else {
    frame.destroy()
    state.mainFrame = undefined
  }
}

const funcs = guiFuncs("dev2", {
  closeMainFrame(this: GuiElement) {
    toggleInterface(game.get_player(this.player_index))
  },
  toggleActivation(this: ButtonGuiElement) {
    const state = guiState(this.player_index)
    state.controlsActive = !state.controlsActive
    updateGui(state)
  },
  setButtonCount(this: GuiElement) {
    const state = guiState(this.player_index)
    if (this.type === "slider") {
      state.buttonCount = this.slider_value
    } else if (this.type === "textfield") {
      const newButtonCount = tonumber(this.text) || 0
      state.buttonCount = math.min(newButtonCount, itemSprites.length)
    }
    updateGui(state)
  },
  spriteButtonClick(this: SpriteButtonGuiElement) {
    const state = guiState(this.player_index)
    state.selectedItem = this.tags.spriteName as string
    updateGui(state)
  },
})

// noinspection ES6ShorthandObjectProperty
const template: GuiTemplate<UggState> = {
  type: "frame",
  caption: ["ugg.hello_world"],
  elementMod: {
    auto_center: true,
  },
  styleMod: {
    size: [385, 165],
  },
  onCreated() {
    const state = guiState(this.player_index)
    state.mainFrame = this
    game.get_player(this.player_index).opened = this
  },
  onClosed: funcs.closeMainFrame,
  children: [
    {
      name: "content_frame",
      type: "frame",
      direction: "vertical",
      style: "ugg_content_frame",
      children: [
        {
          name: "controls_flow",
          type: "flow",
          direction: "horizontal",
          style: "ugg_controls_flow",
          children: [
            {
              name: "ugg_controls_toggle",
              type: "button",
              elementMod: {
                caption: (state) =>
                  state.controlsActive ? ["ugg.deactivate"] : ["ugg.activate"],
              },
              onClick: funcs.toggleActivation,
            },
            {
              name: "ugg_controls_slider",
              type: "slider",
              minimum_value: 0,
              maximum_value: itemSprites.length,
              style: "notched_slider",
              elementMod: {
                slider_value: (p) => p.buttonCount,
                enabled: (p) => p.controlsActive,
              },
              onAction: funcs.setButtonCount,
            },
            {
              name: "ugg_controls_textfield",
              type: "textfield",
              numeric: true,
              allow_decimal: false,
              allow_negative: false,
              style: "ugg_controls_textfield",
              elementMod: {
                text: (p) => tostring(p.buttonCount),
                enabled: (p) => p.controlsActive,
              },
              onAction: funcs.setButtonCount,
            },
          ],
        },
        {
          name: "button_frame",
          type: "frame",
          direction: "horizontal",
          style: "ugg_deep_frame",
          children: [
            {
              name: "button_table",
              type: "table",
              column_count: itemSprites.length,
              style: "filter_slot_table",
              onUpdate(this: TableGuiElement, state) {
                buildSpriteButtons(this, state)
              },
            },
          ],
        },
      ],
    },
  ],
}

// noinspection JSUnusedGlobalSymbols
const spriteButton: GuiTemplate<{ spriteName: string; selected: boolean }> = {
  type: "sprite-button",
  elementMod: {
    sprite: ({ spriteName }) => "item/" + spriteName,
    style: ({ selected }) =>
      (selected ? "yellow_slot_button" : "recipe_slot_button") as any,
    tags: (p) => p,
  },
  onAction: funcs.spriteButtonClick,
}

function buildSpriteButtons(table: TableGuiElement, state: UggState) {
  table.clear()
  const numButtons = state.buttonCount
  for (let i = 0; i < numButtons; i++) {
    const spriteName = itemSprites[i]
    create(table, spriteButton, {
      spriteName,
      selected: spriteName === state.selectedItem,
    })
  }
}

DevButton("Show Gui2", (player) => {
  toggleInterface(player)
})
registerHandlers({
  ugg_toggle_interface: (e: OnCustomInputPayload) => {
    const player = game.get_player(e.player_index)
    toggleInterface(player)
  },
})
