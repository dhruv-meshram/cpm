export async function emitToProjectRoom(projectId: string, event: string, payload: any) {
  try {
    const room = `project:${projectId}`;
    // Send event to the internal WebSocket HTTP bridge
    const wsUrl = process.env.INTERNAL_WS_SERVER_URL || 'http://localhost:3001';
    await fetch(`${wsUrl}/emit`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EMIT_SECRET || 'dev-emit-secret'}`
      },
      body: JSON.stringify({ room, event, payload })
    });
  } catch (error) {
    // Fail silently so we don't break REST APIs if the WS server is down
    console.warn('Failed to emit WS event, server might be down:', error);
  }
}
