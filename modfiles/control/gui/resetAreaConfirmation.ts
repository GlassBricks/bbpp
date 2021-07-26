import { SimpleConfirmation } from "../../framework/gui/components/SimpleConfirmation"
import { r, registerFuncs } from "../../framework/funcRef"
import { BpArea } from "../BpArea"

const funcs = registerFuncs({
  resetArea(area: BpArea) {
    area.reset()
  },
})

export function showResetAreaConfirmation(area: BpArea, player: LuaPlayer): void {
  SimpleConfirmation.display(player, {
    title: "Confirmation",
    text: `Are you sure you want to reset the area "${area.name}?" This will overwrite any unsaved changes.`,
    backText: "Back",
    confirmText: "Reset",
    redConfirm: true,
    onConfirm: r(funcs.resetArea),
    data: area,
  })
}
