export async function emitToProjectRoom(projectId: string, event: string, payload: any) {
  try {
    const room = `project:${projectId}`;
    // Send event to the internal WebSocket HTTP bridge
    await fetch('http://localhost:3001/emit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room, event, payload })
    });
  } catch (error) {
    // Fail silently so we don't break REST APIs if the WS server is down
    console.warn('Failed to emit WS event, server might be down:', error);
  }
}
