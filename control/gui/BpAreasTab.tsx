import Reactorio, { AnySpec, Component, registerComponent } from "../../framework/gui"
import { BpGuiUpdate } from "./BpAreaEditor"
import { AreaNavigator } from "./AreaNavigator"

@registerComponent()
export class BpAreasTab extends Component<BpGuiUpdate> {
  protected create(): AnySpec | undefined {
    return (
      <table column_count={1} style={"bordered_table"}>
        <AreaNavigator />
      </table>
    )
  }

  protected update(): void {
    // todo
  }
}
