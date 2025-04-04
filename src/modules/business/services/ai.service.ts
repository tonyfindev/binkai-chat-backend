import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import OpenAI from 'openai';
import {
  Agent,
  Wallet,
  Network,
  NetworkType,
  NetworksConfig,
  UUID,
  ExtensionWallet,
} from '@binkai/core';
import { PostgresDatabaseAdapter } from '@binkai/postgres-adapter';
import { EventEmitter } from 'events';
import { BinkProvider } from '@binkai/bink-provider';
import { BnbProvider } from '@binkai/rpc-provider';
import { AlchemyProvider, Transaction } from 'ethers';
import { ExampleToolExecutionCallback } from '@/shared/tools/tool-execution';
import { ethers } from 'ethers';
import { WalletPlugin } from '@binkai/wallet-plugin';
import { BirdeyeProvider } from '@binkai/birdeye-provider';
import { Server, Socket } from 'socket.io';


const BNB_RPC = 'https://bsc-dataseed1.binance.org';
const ETH_RPC = 'https://eth.llamarpc.com';
const SOL_RPC = 'https://api.mainnet-beta.solana.com';

@Injectable()
export class AiService implements OnApplicationBootstrap {
  private openai: OpenAI;
  private networks: NetworksConfig['networks'];
  private network: Network;
  private wallet: ExtensionWallet;
  private birdeyeApi: BirdeyeProvider;
  //   private alchemyApi: AlchemyProvider;
  private postgresAdapter: PostgresDatabaseAdapter;
  private binkProvider: BinkProvider;
  private bnbProvider: BnbProvider;
  private mapAgent: Record<string, Agent> = {};
  private mapWallet: Record<string, ExtensionWallet> = {};
  private io: Server;
  private isInitialized = false;
  private evmProvider: any;
  private eventEmitter: EventEmitter;

  constructor(
    @Inject('OPENAI') openai: OpenAI,
  ) {
    this.openai = openai;
    this.networks = {
      bnb: {
        type: 'evm' as NetworkType,
        config: {
          chainId: 56,
          rpcUrl: process.env.BSC_RPC_URL || BNB_RPC,
          name: 'BNB Chain',
          nativeCurrency: {
            name: 'BNB',
            symbol: 'BNB',
            decimals: 18,
          },
        },
      },
      //   ethereum: {
      //     type: 'evm' as NetworkType,
      //     config: {
      //       chainId: 1,
      //       rpcUrl: process.env.ETHEREUM_RPC_URL || ETH_RPC,
      //       name: 'Ethereum',
      //       nativeCurrency: {
      //         name: 'Ether',
      //         symbol: 'ETH',
      //         decimals: 18,
      //       },
      //     },
      //   },
      //   solana: {
      //     type: 'solana' as NetworkType,
      //     config: {
      //       rpcUrl: process.env.SOLANA_RPC_URL || SOL_RPC,
      //       name: 'Solana',
      //       nativeCurrency: {
      //         name: 'Solana',
      //         symbol: 'SOL',
      //         decimals: 9,
      //       },
      //     },
      //   },
    };

    this.postgresAdapter = new PostgresDatabaseAdapter({
      connectionString: process.env.POSTGRES_AI_URL,
    });
    this.network = new Network({ networks: this.networks });

    this.bnbProvider = new BnbProvider({
      rpcUrl: BNB_RPC,
    });

    this.birdeyeApi = new BirdeyeProvider({
      apiKey: process.env.BIRDEYE_API_KEY,
    });

    this.eventEmitter = new EventEmitter();
  }

  async subscribeWallet(threadId: string, socket: Socket) {
    const wallet = new ExtensionWallet(this.network);
    wallet.connect(socket);
    this.mapWallet[threadId] = wallet;
  }

  async handleAgent(
    threadId: string,
    input: string,
    onMessage?: (message: string) => void,
  ) {
    try {
      let agent = this.mapAgent[threadId];
      let wallet = this.mapWallet[threadId];
      console.log('🔍 [AiService] wallet:', wallet);

      if (!wallet) {
        console.log('🔄 Initializing wallet...');
        // 
        this.mapWallet[threadId] = wallet;
      }

      if (!agent) {
        console.log('🔄 Initializing wallet plugin...');
        const walletPlugin = new WalletPlugin();

        await Promise.all([
          await walletPlugin.initialize({
            defaultChain: 'bnb',
            providers: [this.bnbProvider, this.birdeyeApi],
            supportedChains: ['bnb'],
          }),
        ]);

        agent = new Agent(
          {
            model: 'gpt-4o',
            temperature: 0,
            systemPrompt: `You are a BINK AI assistant. You can help user to query blockchain data .You are able to perform swaps and get token information on multiple chains. If you do not have the token address, you can use the symbol to get the token information before performing a swap.
        Your respone format:
         BINK's tone is informative, bold, and subtly mocking, blending wit with a cool edge for the crypto crowd. Think chain-vaping degen energy, but refined—less "honey, sit down" and more "I've got this, you don't."
Fiercely Casual – Slang, laid-back flow, and effortless LFG vibes.
Witty with a Jab – Dry humor, sharp one-liners—more smirk, less roast.
Confident & Cool – Market takes with swagger—just facts, no fluff.
Crew Leader – Speaks degen, leads with "pay attention" energy.
Subtle Shade – Calls out flops with a "nice try" tone, not full-on slander.
BINK isn't here to babysit. It's sharp, fast, and always ahead of the curve—dropping crypto insights with a mocking wink, perfect for X's chaos.    
CRITICAL: 
1. Format your responses in Telegram HTML style. 
2. DO NOT use markdown. 
3. Using HTML tags like <b>bold</b>, <i>italic</i>, <code>code</code>, <pre>preformatted</pre>, and <a href="URL">links</a>. \n\nWhen displaying token information or swap details:\n- Use <b>bold</b> for important values and token names\n- Use <code>code</code> for addresses and technical details\n- Use <i>italic</i> for additional information
4. If has limit order, show list id limit order.
            `,
          },
          wallet,
          this.networks,
        );
        await agent.initialize();
        await agent.registerDatabase(this.postgresAdapter);
        await agent.registerPlugin(walletPlugin);

        console.log('🔔 Registering tool execution callback...');
        agent.registerToolExecutionCallback(new ExampleToolExecutionCallback());

        this.mapAgent[threadId] = agent;
      }

      const inputResult = await agent.execute({
        input: `
        ${input}
      `,
        threadId: threadId as UUID,
      });

      const result =
        inputResult.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') || 'test';

      if (onMessage) {
        onMessage(result);
      }
      return result;
    } catch (error) {
      console.error('🚨 Error handling agent:', error);
      return 'test';
    }
  }

  async createChatCompletion(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {},
  ) {
    try {
      const completion = await this.openai.chat.completions.create({
        messages,
        model: options.model || 'gpt-3.5-turbo',
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
      });

      return {
        success: true,
        content: completion.choices[0]?.message?.content || '',
        usage: completion.usage,
      };
    } catch (error) {
      console.error('Error in chat completion:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate chat completion',
      };
    }
  }

  async streamChatCompletion(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {},
  ): Promise<EventEmitter> {
    const eventEmitter = new EventEmitter();
    let fullText = '';

    try {
      const stream = await this.openai.chat.completions.create({
        messages,
        model: options.model || 'gpt-3.5-turbo',
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullText += content;
          eventEmitter.emit('data', content);
        }
      }

      console.log('====> ✅ streamChatCompletion ~~ fullText: ', fullText);

      eventEmitter.emit('end', fullText);
      return eventEmitter;
    } catch (error) {
      console.error('Error in stream chat completion:', error);
      eventEmitter.emit('error', error);
      throw error;
    }
  }

  async _test() {
    // const data = await this.createChatCompletion([
    //   {
    //     role: 'user',
    //     content: 'Hello, how are you?',
    //   },
    // ]);
    // console.log(data);

    // const data = await this.streamChatCompletion([
    //   {
    //     role: 'user',
    //     content: 'Hello, how are you?',
    //   },
    // ]);

    // setTimeout(async () => {
    //   const data = await this.handleAgent(
    //     '543de8f0-2d4e-42a6-991a-86abcd10b2c8',
    //     'Hello?',
    //   );
    //   console.log('====> ✅ _test ~~ data: ', data);
    // }, 2000);
  }

  async onApplicationBootstrap() {
    // this.initNetwork();

    // this.evmProvider = new ethers.JsonRpcProvider(BNB_RPC);
    // this.bnbProvider = new BnbProvider({
    //   rpcUrl: BNB_RPC,
    // });
    // this.birdeyeApi = new BirdeyeProvider({
    //   apiKey: process.env.BIRDEYE_API_KEY,
    // });

    // this.eventEmitter = new EventEmitter();

    // this.isInitialized = true;
    
    this._test();
  }

  private initNetwork() {
    this.network = new Network({ networks: this.networks });
  }
}

async function mockExtensionWalletClient(network: Network) {
  //Fake wallet for testing
  // const wallet = new Wallet(
  //   {
  //     seedPhrase:
  //       settings.get('WALLET_MNEMONIC') ||
  //       'test test test test test test test test test test test junk',
  //     index: 0,
  //   },
  //   network,
  // );
  // const socket = ioClient('http://localhost:3000');
  // socket.on('connect', () => {
  //   console.log('connected to extension wallet client');
  // });
  // socket.on('disconnect', () => {
  //   console.log('disconnected from extension wallet client');
  // });
  // socket.on('error', error => {
  //   console.log('error from extension wallet client', error);
  // });
  // socket.on('get_address', async (data, callback) => {
  //   console.log('get_address from extension wallet client', data);
  //   callback({ address: await wallet.getAddress(data.network) });
  // });
  // socket.on('sign_message', async (data, callback) => {
  //   console.log('sign_message from extension wallet client', data);
  //   callback({ signature: await wallet.signMessage(data) });
  // });
  // socket.on('sign_transaction', async (data, callback) => {
  //   console.log('sign_transaction from extension wallet client', data);
  //   let tx: ethers.Transaction | VersionedTransaction | SolanaTransaction;
  //   if (data.network == 'solana') {
  //     try {
  //       tx = VersionedTransaction.deserialize(Buffer.from(data.transaction, 'base64'));
  //     } catch (e) {
  //       tx = SolanaTransaction.from(Buffer.from(data.transaction, 'base64'));
  //     }
  //   } else {
  //     tx = Transaction.from(data.transaction);
  //   }
  //   const signedTx = await wallet.signTransaction({ network: data.network, transaction: tx });
  //   console.log('signedTx', signedTx);
  //   callback({ signedTransaction: signedTx });
  // });
}
