# Chat Events Implementation Guide

This document explains the new chat events implemented in the ChatGateway for notifying receivers about new messages and managing conversation lists.

## New Events Added

### 1. `new_message_received` Event

**Purpose**: Notifies a user when they receive a new message in any conversation they're part of.

**When it's sent**: 
- When a new message is sent to a conversation
- Sent to all participants except the sender
- Sent to users who are online but not currently in the conversation room

**Event Data Structure**:
```typescript
{
  conversationId: string;
  message: {
    id: string;
    content: string;
    senderId: string;
    timestamp: Date;
  };
  sender: {
    id: string;
    username: string;
  };
  action: 'refresh_conversation_list';
  timestamp: Date;
}
```

**Frontend Implementation**:
```typescript
// Listen for new message received events
socket.on('new_message_received', (data) => {
  console.log('New message received:', data);
  
  // Check if the conversation is already in the user's conversation list
  const conversationExists = userConversations.some(
    conv => conv.id === data.conversationId
  );
  
  if (!conversationExists) {
    // Conversation not in list, refresh the conversation list
    console.log('New conversation detected, refreshing list...');
    refreshConversationList();
  } else {
    // Conversation exists, just update the unread count or show notification
    updateConversationUnreadCount(data.conversationId);
    showNewMessageNotification(data);
  }
});

// Function to refresh conversation list
const refreshConversationList = async () => {
  try {
    const response = await fetch('/api/conversations', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const conversations = await response.json();
    setUserConversations(conversations);
  } catch (error) {
    console.error('Failed to refresh conversations:', error);
  }
};
```

### 2. `refresh_conversation_list` Event

**Purpose**: Allows users to manually request a conversation list refresh.

**When it's sent**: When a user explicitly requests to refresh their conversation list.

**Frontend Implementation**:
```typescript
// Request conversation list refresh
const requestConversationRefresh = () => {
  socket.emit('refresh_conversation_list');
};

// Listen for refresh confirmation
socket.on('conversation_list_refresh_requested', (data) => {
  console.log('Refresh requested:', data);
  // The backend suggests calling the API to refresh
  refreshConversationList();
});
```

### 3. `check_conversation_status` Event

**Purpose**: Check the current status of a conversation (if user is in room, who's online, etc.).

**When it's sent**: When a user wants to check the status of a specific conversation.

**Frontend Implementation**:
```typescript
// Check conversation status
const checkConversationStatus = (conversationId: string) => {
  socket.emit('check_conversation_status', { conversationId });
};

// Listen for conversation status
socket.on('conversation_status', (data) => {
  console.log('Conversation status:', data);
  
  if (!data.isInRoom) {
    // User is not in the conversation room, join it
    joinConversation(data.conversationId);
  }
  
  // Update online participants display
  updateOnlineParticipants(data.onlineParticipants);
});
```

## Complete Frontend Integration Example

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Conversation {
  id: string;
  title: string;
  lastMessage?: string;
  unreadCount: number;
  participants: string[];
}

export const useChatSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001', {
      auth: {
        sessionId: getSessionId() // Get from cookies or localStorage
      }
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('Connected to chat server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from chat server');
      setIsConnected(false);
    });

    // Chat events
    newSocket.on('new_message_received', handleNewMessageReceived);
    newSocket.on('conversation_list_refresh_requested', handleRefreshRequested);
    newSocket.on('conversation_status', handleConversationStatus);
    newSocket.on('new_message', handleNewMessage);
    newSocket.on('user_typing', handleUserTyping);
    newSocket.on('messages_read', handleMessagesRead);

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const handleNewMessageReceived = (data: any) => {
    console.log('New message received:', data);
    
    // Check if conversation exists in current list
    const conversationExists = conversations.some(
      conv => conv.id === data.conversationId
    );
    
    if (!conversationExists) {
      // New conversation, refresh the list
      refreshConversationList();
    } else {
      // Update existing conversation
      updateConversationUnreadCount(data.conversationId);
    }
    
    // Show notification
    showNewMessageNotification(data);
  };

  const handleRefreshRequested = (data: any) => {
    console.log('Refresh requested:', data);
    refreshConversationList();
  };

  const handleConversationStatus = (data: any) => {
    console.log('Conversation status:', data);
    // Handle conversation status updates
  };

  const refreshConversationList = async () => {
    try {
      const response = await fetch('/api/conversations', {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      const newConversations = await response.json();
      setConversations(newConversations);
    } catch (error) {
      console.error('Failed to refresh conversations:', error);
    }
  };

  const joinConversation = (conversationId: string) => {
    if (socket) {
      socket.emit('join_conversation', { conversationId });
    }
  };

  const leaveConversation = (conversationId: string) => {
    if (socket) {
      socket.emit('leave_conversation', { conversationId });
    }
  };

  const sendMessage = (conversationId: string, content: string) => {
    if (socket) {
      socket.emit('send_message', { conversationId, content });
    }
  };

  return {
    socket,
    conversations,
    isConnected,
    joinConversation,
    leaveConversation,
    sendMessage,
    refreshConversationList,
    checkConversationStatus: (conversationId: string) => {
      if (socket) {
        socket.emit('check_conversation_status', { conversationId });
      }
    }
  };
};
```

## Key Benefits

1. **Real-time Notifications**: Users get immediate notifications about new messages
2. **Smart Refresh**: Only refreshes conversation list when new conversations are detected
3. **Room Management**: Automatically manages conversation room membership
4. **Status Tracking**: Provides real-time conversation and user status information
5. **Efficient Communication**: Minimizes unnecessary API calls while keeping data fresh

## Best Practices

1. **Always check if conversation exists** before refreshing the entire list
2. **Use the `action` field** to determine what the frontend should do
3. **Handle connection states** properly to avoid sending events when disconnected
4. **Implement proper error handling** for all socket events
5. **Use the conversation status check** to ensure proper room membership
