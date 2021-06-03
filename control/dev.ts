import { PlayerData } from "../framework/playerData"
import { GuiComponent } from "../framework/gui"
import { registerHandlers } from "../framework/events"

interface UGGPlayerState {
  controlsActive: boolean
  buttonCount: number
  selectedItem?: string

  mainFrame?: LuaGuiElement
}

const guiState = PlayerData<UGGPlayerState>("guiState", () => ({
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

const uggComponent = GuiComponent<UGGPlayerState>("UGG_Tutorial", {
  type: "frame",
  caption: ["ugg.hello_world"],
  onCreated() {
    this.style.size = [385, 165]
    this.auto_center = true

    game.get_player(this.player_index).opened = this
  },
  on_gui_closed(event) {
    toggleInterface(game.get_player(event.player_index))
  },

  children: {
    content_frame: {
      type: "frame",
      direction: "vertical",
      style: "ugg_content_frame",
      children: {
        controls_flow: {
          type: "flow",
          direction: "horizontal",
          style: "ugg_controls_flow",
          children: {
            ugg_controls_toggle: {
              type: "button",
              onUpdate(state) {
                this.caption = state.controlsActive
                  ? ["ugg.deactivate"]
                  : ["ugg.activate"]
              },
              onAction(event, component) {
                const state = guiState(event.player_index)
                state.controlsActive = !state.controlsActive
                component.update(this, state)
              },
            },
            ugg_controls_slider: {
              type: "slider",
              minimum_value: 0,
              maximum_value: itemSprites.length,
              style: "notched_slider",
              onUpdate(state) {
                this.enabled = state.controlsActive
                this.slider_value = state.buttonCount
              },
              onAction(e, component) {
                const state = guiState(e.player_index)
                state.buttonCount = e.element.slider_value
                component.update(this, state)
              },
            },
            ugg_controls_textfield: {
              type: "textfield",
              numeric: true,
              allow_decimal: false,
              allow_negative: false,
              style: "ugg_controls_textfield",
              onUpdate(state) {
                this.enabled = state.controlsActive
                this.text = tostring(state.buttonCount)
              },
              onAction(e, component) {
                const state = guiState(e.player_index)

                const newButtonCount = tonumber(e.element.text) || 0
                state.buttonCount = math.min(newButtonCount, itemSprites.length)
                component.update(this, state)
              },
            },
          },
        },
        button_frame: {
          type: "frame",
          direction: "horizontal",
          style: "ugg_deep_frame",
          children: {
            button_table: {
              type: "table",
              column_count: itemSprites.length,
              style: "filter_slot_table",
              onUpdate(state) {
                buildSpriteButtons(this, state)
              },
            },
          },
        },
      },
    },
  },
})
const spriteButton = GuiComponent<[UGGPlayerState, string]>(
  "UGG_spriteButton",
  {
    type: "sprite-button",
    onCreated([state, spriteName]) {
      this.sprite = "item/" + spriteName
      this.style = (
        spriteName === state.selectedItem
          ? "yellow_slot_button"
          : "recipe_slot_button"
      ) as any
      this.tags = { ...this.tags, spriteName }
    },
    onAction() {
      const state = guiState(this.player_index)
      state.selectedItem = this.tags.spriteName as string
      uggComponent.update(this.parent, state)
    },
  }
)

function buildSpriteButtons(buttonTable: LuaGuiElement, state: UGGPlayerState) {
  buttonTable.clear()
  const numButtons = state.buttonCount
  for (let i = 0; i < numButtons; i++) {
    const spriteName = itemSprites[i]
    spriteButton.addTo(buttonTable, null, [state, spriteName])
  }
}

function toggleInterface(player: LuaPlayer) {
  const state = guiState(player.index)
  const frame = state.mainFrame
  if (!frame || !frame.valid) {
    state.mainFrame = uggComponent.addTo(
      player.gui.screen,
      "ugg_main_frame",
      state
    )
  } else {
    frame.destroy()
    state.mainFrame = undefined
  }
}

registerHandlers({
  ugg_toggle_interface: (e: OnCustomInputPayload) => {
    const player = game.get_player(e.player_index)
    toggleInterface(player)
  },
})
