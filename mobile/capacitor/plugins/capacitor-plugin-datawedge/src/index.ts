import { registerPlugin } from "@capacitor/core";
import type { DataWedgePlugin } from "./definitions";

const DataWedge = registerPlugin<DataWedgePlugin>("DataWedge");

export default DataWedge;
