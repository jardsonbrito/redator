export type AdminEvent =
  | { name: "admin_card_render"; payload: { module: string; count: number } }
  | { name: "admin_card_action_click"; payload: { module: string; action: string; id: string } }
  | { name: "admin_image_fallback"; payload: { module: string; id: string } };

export function trackAdminEvent(name: AdminEvent["name"], payload: any) {
  // Minimal telemetry: console log (can be replaced by Supabase insert later)
  try {
    // eslint-disable-next-line no-console
    console.log(`[telemetry] ${name}`, payload);
  } catch {
    // noop
  }
}
