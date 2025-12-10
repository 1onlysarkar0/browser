'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      withCredentials: true,
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const subscribeToUrl = useCallback((urlId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('subscribe:url', urlId);
    }
  }, []);

  const unsubscribeFromUrl = useCallback((urlId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('unsubscribe:url', urlId);
    }
  }, []);

  const onUrlStatusUpdate = useCallback((callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('url:status-update', callback);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off('url:status-update', callback);
      }
    };
  }, []);

  const onExecutionStart = useCallback((callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('url:execution-start', callback);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off('url:execution-start', callback);
      }
    };
  }, []);

  const onExecutionComplete = useCallback((callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('url:execution-complete', callback);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off('url:execution-complete', callback);
      }
    };
  }, []);

  const onScreenshotCaptured = useCallback((callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('screenshot:captured', callback);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off('screenshot:captured', callback);
      }
    };
  }, []);

  return {
    socket: socketRef.current,
    subscribeToUrl,
    unsubscribeFromUrl,
    onUrlStatusUpdate,
    onExecutionStart,
    onExecutionComplete,
    onScreenshotCaptured,
  };
}
