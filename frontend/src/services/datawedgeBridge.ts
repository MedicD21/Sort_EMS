// Small initialization to register the DataWedge Cordova plugin when the device is ready.
// This will make sure the native side broadcasts are set up and will forward events into the WebView.

export function initDataWedgeBridge() {
  // Only register when running inside Cordova
  if (typeof window === "undefined") return;
  // Detect Cordova
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if ((window as any).cordova) {
    document.addEventListener("deviceready", () => {
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (
          window.DataWedge &&
          typeof window.DataWedge.register === "function"
        ) {
          // ensure the native plugin sets up its broadcast receiver
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          window.DataWedge.register(
            () => {
              // registered
              console.debug("DataWedge plugin registered");
            },
            (err: any) => {
              console.warn("DataWedge register error", err);
            }
          );
        }
      } catch (e) {
        console.warn("DataWedge register exception", e);
      }
    });
    return;
  }

  // Detect Capacitor (native runtime)
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if ((window as any).Capacitor) {
      // Use dynamic import so the app still builds when Capacitor isn't installed for web dev
      import("@capacitor/core")
        .then(({ Plugins }) => {
          // @ts-ignore
          const DataWedge = Plugins.DataWedge;
          if (DataWedge && typeof DataWedge.addListener === "function") {
            DataWedge.addListener("scan", (info: any) => {
              window.dispatchEvent(
                new CustomEvent("datawedge", { detail: info })
              );
            });
            // Ensure the native plugin registers any native receiver if needed
            if (typeof DataWedge.register === "function") {
              DataWedge.register().catch((e: any) =>
                console.warn("DataWedge register error", e)
              );
            }
          }
        })
        .catch((e) => {
          // Capacitor not present or plugin not added; ignore silently
          console.debug("Capacitor DataWedge init skipped", e);
        });
    }
  } catch (err) {
    // ignore
  }
}
