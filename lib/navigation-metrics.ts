export const NAVIGATION_METRICS_EVENT = "nrapp:navigation-metrics-changed";

export function notifyNavigationMetricsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NAVIGATION_METRICS_EVENT));
  }
}
