'use client';

import { useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

export function WebSocketListener() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string | undefined;
  const wsRef = useRef<WebSocket | null>(null);
  const currentRoomRef = useRef<string | null>(null);

  // Fetch current user details
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const res = await fetch('/api/v1/users/me');
      if (!res.ok) return null;
      return res.json();
    }
  });

  useEffect(() => {
    let active = true;
    let reconnectTimeout: NodeJS.Timeout;

    async function initWebSocket() {
      try {
        // Fetch the token securely via the API endpoint
        const tokenRes = await fetch('/api/v1/auth/token');
        if (!tokenRes.ok) return;
        const { token } = await tokenRes.json();
        if (!token) return;

        if (!active) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const defaultWs = `${protocol}//${window.location.host}`;
        const baseWsUrl = process.env.NEXT_PUBLIC_WS_URL || defaultWs;
        const wsUrl = `${baseWsUrl}?token=${encodeURIComponent(token)}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[WS] Connected');
          // If we are already on a project page, join the room immediately
          if (projectId) {
            const room = `project:${projectId}`;
            ws.send(JSON.stringify({ type: 'join_project', room }));
            currentRoomRef.current = room;
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === 'user_removed') {
              const { userId, projectName } = data.payload;
              if (user && userId === user.id) {
                // Current user was removed! Redirect to dashboard with message query param
                router.push(`/dashboard?removedFrom=${encodeURIComponent(projectName)}`);
              }
            }
          } catch (e) {
            console.error('[WS] Message parse error', e);
          }
        };

        ws.onclose = () => {
          console.log('[WS] Closed');
          if (active) {
            // Reconnect after 3 seconds
            reconnectTimeout = setTimeout(initWebSocket, 3000);
          }
        };

        ws.onerror = (err) => {
          console.error('[WS] Error', err);
          ws.close();
        };

      } catch (err) {
        console.error('[WS] Init failed', err);
        if (active) {
          reconnectTimeout = setTimeout(initWebSocket, 5000);
        }
      }
    }

    if (user) {
      initWebSocket();
    }

    return () => {
      active = false;
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user]);

  // Handle path/projectId navigation changes to leave/join project rooms
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const newRoom = projectId ? `project:${projectId}` : null;
    const oldRoom = currentRoomRef.current;

    if (oldRoom && oldRoom !== newRoom) {
      ws.send(JSON.stringify({ type: 'leave_project', room: oldRoom }));
      currentRoomRef.current = null;
    }

    if (newRoom && newRoom !== oldRoom) {
      ws.send(JSON.stringify({ type: 'join_project', room: newRoom }));
      currentRoomRef.current = newRoom;
    }
  }, [projectId]);

  return null;
}
