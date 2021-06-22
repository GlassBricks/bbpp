import { onPlayerInit, PlayerData } from "../framework/playerData"
import { ElementSpec, FC, renderIn } from "../framework/gui"
import createComponent from "../framework/jsx"
import { registerFuncs } from "../framework/funcRef"
import { deepCopy } from "../framework/util"

// forward declare here, as typescript-to-lua doesn't yet _fully_ support jsx, and my sketchy plugin doesn't yet handle
// this
// eslint-disable-next-line prefer-const
let UggFrame: FC<{ state: GuiState }>

const guiState = PlayerData<GuiState>("guiState", () => ({ controlsActive: true, buttonCount: 5 }))

function updateRootGui(player: LuaPlayer) {
  const state = guiState(player.index)
  // is copy necessary? (maybe in future)
  renderIn(player.gui.screen, "ugg", <UggFrame state={deepCopy(state)} />)
}

interface GuiState {
  controlsActive: boolean
  buttonCount: number
  selectedItem?: string
}

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
// TODO: state handling
const funcs = {
  toggleControls({ player_index }: { player_index: number }) {
    const state = guiState(player_index)
    state.controlsActive = !state.controlsActive
    updateRootGui(game.get_player(player_index))
  },
  sliderUpdate(element: SliderGuiElement) {
    const player = game.get_player(element.player_index)
    const state = guiState(element.player_index)
    state.buttonCount = element.slider_value
    updateRootGui(player)
  },
  textfieldUpdate(element: TextfieldGuiElement) {
    const player = game.get_player(element.player_index)
    const state = guiState(element.player_index)

    const new_button_count = tonumber(element.text) || 0
    state.buttonCount = math.min(new_button_count, itemSprites.length)
    updateRootGui(player)
  },
  spriteButtonClick(element: SpriteButtonGuiElement) {
    const player = game.get_player(element.player_index)
    const state = guiState(element.player_index)
    state.selectedItem = element.tags.spriteName as string
    updateRootGui(player)
  },
}
registerFuncs(funcs, "ugg")

// TODO component state
function SlotButtons({ buttonCount, selectedItem }: { buttonCount: number; selectedItem?: string }): ElementSpec {
  return (
    <table created_column_count={itemSprites.length} created_style={"filter_slot_table"}>
      {itemSprites.slice(0, buttonCount).map((spriteName) => (
        <sprite-button
          sprite={"item/" + spriteName}
          style={spriteName === selectedItem ? "yellow_slot_button" : "recipe_slot_button"}
          tags={{ spriteName }}
          onClick={funcs.spriteButtonClick}
        />
      ))}
    </table>
  )
}

UggFrame = ({ state }) => (
  <frame
    caption={["ugg.hello_world"]}
    styleMod={{
      size: [385, 165],
    }}
    auto_center
  >
    <frame created_direction={"vertical"} created_style={"ugg_content_frame"}>
      <flow created_direction={"horizontal"} created_style={"ugg_controls_flow"}>
        <button caption={state.controlsActive ? ["ugg.deactivate"] : ["ugg.activate"]} onClick={funcs.toggleControls} />
        <slider
          created_minimum_value={0}
          created_maximum_value={itemSprites.length}
          created_style={"notched_slider"}
          enabled={state.controlsActive}
          slider_value={state.buttonCount}
          onValueChanged={funcs.sliderUpdate}
        />
        <textfield
          numeric
          allow_decimal={false}
          allow_negative={false}
          created_style={"ugg_controls_textfield"}
          enabled={state.controlsActive}
          text={tostring(state.buttonCount)}
          onTextChanged={funcs.textfieldUpdate}
        />
      </flow>
      <frame created_direction={"horizontal"} created_style={"ugg_deep_frame"}>
        <SlotButtons buttonCount={state.buttonCount} selectedItem={state.selectedItem} />
      </frame>
    </frame>
  </frame>
)

onPlayerInit((player) => {
  updateRootGui(player)
})
