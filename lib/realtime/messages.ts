// Wire message types for the Yjs sync protocol. Shared by the server (lib/realtime)
// and the client (lib/sync) — this is the only realtime module safe to import on the
// client (it has no server-only dependencies).
export const MESSAGE_SYNC = 0
export const MESSAGE_AWARENESS = 1
