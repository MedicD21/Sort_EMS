export interface ScanEvent {
  tag: string;
}

export interface DataWedgePlugin {
  register(): Promise<void>;
}
