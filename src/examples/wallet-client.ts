import { io as ioClient } from 'socket.io-client';

/**
 * Example client connecting to WalletGateway
 * - Simulates extension wallet in browser
 * - Handles signing requests from server
 */

const SOCKET_URL = 'http://localhost:9000/wallet'; // WalletGateway URL

async function connectWalletClient() {
  console.log('🚀 Initializing wallet client...');
  
  // Create connection to server
  const socket = ioClient(SOCKET_URL);

  // Handle connection event
  socket.on('connect', () => {
    console.log('✅ Connected to server');
    
    // Test connection
    socket.emit('test', 'Hello from wallet', (response) => {
      console.log('📌 Test result:', response);
    });
  });

  // Handle disconnect event
  socket.on('disconnect', () => {
    console.log('🔴 Disconnected from server');
  });

  // Handle connection error
  socket.on('error', (error) => {
    console.error('🔴 Connection error:', error);
  });

  // Handle successful connection established event from server
  socket.on('connection_established', (data) => {
    console.log('✅ Connection established:', data);
  });

  // Handle test response event
  socket.on('testResponse', (message) => {
    console.log('📌 Test response from server:', message);
  });

  // Handle broadcast event
  socket.on('broadcast', (message) => {
    console.log('📢 Broadcast from server:', message);
  });

  // Handle request to get wallet address
  socket.on('get_address', async (data, callback) => {
    console.log('📌 Request to get wallet address for network:', data.network);
    
    // Simulate getting address from wallet (in reality would get from MetaMask or other wallet)
    const mockAddresses = {
      'bnb': '0x123456789abcdef123456789abcdef123456789a',
      'ethereum': '0xabcdef123456789abcdef123456789abcdef1234',
      'solana': 'SoLANaX2X3YJ6UwkKxTY8NMEVoE8P5MK23rDDFfY7Xtc'
    };
    
    const address = mockAddresses[data.network] || `mock_address_${Date.now()}`;
    
    // Simulate delay like in real life
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('✅ Returning address:', address);
    callback({ address });
  });

  // Handle request to sign message
  socket.on('sign_message', async (data, callback) => {
    console.log('📌 Request to sign message:', data);
    
    // Simulate displaying confirmation dialog to user
    console.log('👤 Showing to user: "Do you want to sign this message?"');
    console.log('👤 Message:', data.message);
    
    // Simulate delay like in real life and user accepting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate signature (in reality would sign with private key)
    const signature = `0x${''.padStart(130, '0123456789abcdef')}`;
    
    console.log('✅ Returning signature');
    callback({ signature });
  });

  // Handle request to sign transaction
  socket.on('sign_transaction', async (data, callback) => {
    console.log('📌 Request to sign transaction on network:', data.network);
    console.log('📌 Transaction data:', data.transaction);
    
    // Simulate displaying confirmation dialog to user
    console.log('👤 Showing to user: "Do you want to sign this transaction?"');
    console.log('👤 Transaction details:', {
      network: data.network,
      transaction: data.transaction.substring(0, 50) + '...'
    });
    
    // Simulate delay like in real life and user accepting
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate signed transaction (in reality would sign with private key)
    const signedTransaction = `signed_${data.network}_tx_${Date.now()}`;
    
    console.log('✅ Returning signed transaction');
    callback({ signedTransaction });
  });

  return socket;
}

// Run demo client
connectWalletClient().then(socket => {
  console.log('📡 Client listening for requests from server...');
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('👋 Disconnecting and exiting...');
    socket.disconnect();
    process.exit();
  });
}).catch(error => {
  console.error('🔴 Error connecting:', error);
}); 