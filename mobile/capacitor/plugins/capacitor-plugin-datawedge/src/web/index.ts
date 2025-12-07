import { WebPlugin } from "@capacitor/core";

export interface DataWedgePlugin {
  register(): Promise<void>;
}

export class DataWedgeWeb extends WebPlugin implements DataWedgePlugin {
  async register() {
    // No-op in browser
    return;
  }
}

export default new DataWedgeWeb();
