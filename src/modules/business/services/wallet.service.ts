import { Injectable, OnModuleInit } from '@nestjs/common';
import { ExtensionWallet, Network, NetworksConfig, NetworkName, NetworkType } from '@binkai/core';
import { WalletGateway } from '../../../modules/websocket/wallet.gateway';
import { ethers } from 'ethers';
import { Connection } from '@solana/web3.js';

@Injectable()
export class WalletService implements OnModuleInit {
  private walletInstances: Map<string, ExtensionWallet> = new Map();
  private network: Network;

  // Hardcoded RPC URLs for demonstration
  private readonly BNB_RPC = 'https://bsc-dataseed1.binance.org';
  private readonly ETH_RPC = 'https://eth.llamarpc.com';
  private readonly SOL_RPC = 'https://api.mainnet-beta.solana.com';

  constructor(private walletGateway: WalletGateway) {}

  onModuleInit() {
    // Initialize network when module is initialized
    this.initializeNetwork();
  }

  private initializeNetwork() {
    console.log('🌐 Initializing network...');
    
    // Configure supported networks
    const networks: NetworksConfig['networks'] = {
      [NetworkName.BNB]: {
        type: 'evm' as NetworkType,
        config: {
          chainId: 56,
          rpcUrl: this.BNB_RPC,
          name: 'BNB Chain',
          nativeCurrency: {
            name: 'BNB',
            symbol: 'BNB',
            decimals: 18,
          },
        },
      },
      [NetworkName.ETHEREUM]: {
        type: 'evm' as NetworkType,
        config: {
          chainId: 1,
          rpcUrl: this.ETH_RPC,
          name: 'Ethereum',
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
          },
        },
      },
      [NetworkName.SOLANA]: {
        type: 'solana' as NetworkType,
        config: {
          rpcUrl: this.SOL_RPC,
          name: 'Solana',
          nativeCurrency: {
            name: 'Solana',
            symbol: 'SOL',
            decimals: 9,
          },
        },
      },
    };

    // Initialize network
    this.network = new Network({ networks });
    console.log('✅ Network initialized with networks:', Object.keys(networks).join(', '));
  }

  /**
   * Get or create wallet for a clientId
   */
  getOrCreateWallet(clientId: string): ExtensionWallet {
    // Check if wallet already exists for this client
    if (!this.walletInstances.has(clientId)) {
      console.log(`🔄 Creating new wallet for client ${clientId}`);
      
      // Create a new Extension Wallet and store in Map
      const wallet = new ExtensionWallet(this.network);
      this.walletInstances.set(clientId, wallet);
      
      console.log(`✅ Wallet created for client ${clientId}`);
    }
    
    return this.walletInstances.get(clientId);
  }

  /**
   * Connect wallet to socket of a client
   */
  connectWalletToSocket(clientId: string, socket: any): void {
    try {
      const wallet = this.getOrCreateWallet(clientId);
      wallet.connect(socket);
      
      console.log(`✅ Wallet connected to socket of client ${clientId}`);
    } catch (error) {
      console.error(`🔴 Error connecting wallet to socket: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get wallet address on a specific network
   */
  async getWalletAddress(clientId: string, network: NetworkName): Promise<string> {
    try {
      const wallet = this.getOrCreateWallet(clientId);
      const address = await wallet.getAddress(network);
      
      console.log(`✅ Wallet address ${address} on network ${network} for client ${clientId}`);
      return address;
    } catch (error) {
      console.error(`🔴 Error getting wallet address: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sign a message with wallet
   */
  async signMessage(clientId: string, message: string, network: NetworkName): Promise<string> {
    try {
      const wallet = this.getOrCreateWallet(clientId);
      const signature = await wallet.signMessage({ message, network });
      
      console.log(`✅ Message signed successfully for client ${clientId}`);
      return signature;
    } catch (error) {
      console.error(`🔴 Error signing message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sign a transaction with wallet
   */
  async signTransaction(clientId: string, network: NetworkName, transaction: any): Promise<string> {
    try {
      const wallet = this.getOrCreateWallet(clientId);
      const signedTransaction = await wallet.signTransaction({ 
        network,
        transaction
      });
      
      console.log(`✅ Transaction signed successfully on network ${network} for client ${clientId}`);
      return signedTransaction;
    } catch (error) {
      console.error(`🔴 Error signing transaction: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove wallet when client disconnects
   */
  removeWallet(clientId: string): void {
    if (this.walletInstances.has(clientId)) {
      this.walletInstances.delete(clientId);
      console.log(`✅ Wallet removed for client ${clientId}`);
    }
  }

  /**
   * Get Network object
   */
  getNetwork(): Network {
    return this.network;
  }
} 