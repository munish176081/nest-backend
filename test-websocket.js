const io = require('socket.io-client');

// Test WebSocket connection
async function testWebSocket() {
  console.log('Testing WebSocket connection...');
  
  const socket = io('http://localhost:3001/chat', {
    auth: {
      sessionId: 'user:test-user-123', // For development testing
    },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('✅ WebSocket connected successfully!');
    console.log('Socket ID:', socket.id);
    
    // Test joining a conversation
    socket.emit('join_conversation', { conversationId: 'a98807fa-02bd-4fc5-9b1c-d6563aadfbc7' });
  });

  socket.on('connected', (data) => {
    console.log('✅ Server confirmed connection:', data);
  });

  socket.on('joined_conversation', (data) => {
    console.log('✅ Joined conversation:', data);
  });

  socket.on('error', (data) => {
    console.error('❌ WebSocket error:', data);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Disconnected:', reason);
  });

  // Test typing indicator
  setTimeout(() => {
    console.log('Testing typing indicator...');
    socket.emit('typing_start', { conversationId: 'a98807fa-02bd-4fc5-9b1c-d6563aadfbc7' });
  }, 2000);

  // Test typing stop
  setTimeout(() => {
    console.log('Testing typing stop...');
    socket.emit('typing_stop', { conversationId: 'a98807fa-02bd-4fc5-9b1c-d6563aadfbc7' });
  }, 4000);

  // Disconnect after 5 seconds
  setTimeout(() => {
    console.log('Disconnecting...');
    socket.disconnect();
    process.exit(0);
  }, 5000);
}

// Run the test
testWebSocket().catch(console.error); 