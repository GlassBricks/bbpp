import { Data } from "DataStage"
import { Prototypes } from "./constants"

declare const data: Data

const tile = table.deepcopy(data.raw.tile["lab-white"])

tile.name = Prototypes.boundaryTileWhite

tile.order = "z[other]-d[bbpp]-a[boundary]"
tile.collision_mask = ["ground-tile", "object-layer"]

data.extend([tile])
