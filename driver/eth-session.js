
class EthereumSession{
  chain           = null;
  contract        = null;
  contractAddress = null;
  contractABI     = null;
  isWeb3Connected = false;
  lastError       = null;
  provider        = null;
  wallet          = null;

  ethersProvider  = null;
  web3client      = null;

  constructor( args ){
    this.chain = args.chain;
    this.contractAddress = args.contractAddress;
    this.contractABI = args.contractABI;
    this.wallet = new Wallet();

    if( args.provider ){
      this.provider = args.provider;
    }
  }

  async addChain( chain ){
    try{
      this.lastError = null;
      await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [{ 'chainId': chain.hex, 'rpcUrls': chain.rpcURL }] });
      return true;
    }
    catch( err ){
      this.lastError = err;
      return false;
    }
  }

  async connectEthers( deep ){
    if( !window.ethers ){
      try{
        window.ethers = require( 'ethers' );
      }
      catch( err ){
        this.error( "'ethers' is undefined and cannot be imported" );
        return false;
      }
    }

    //let subscribe = false;
    if( window.ethereum && !this.ethersProvider ){
      //subscribe = true;
      this.ethersProvider = new window.ethers.providers.Web3Provider( window.ethereum, 'any' );
      this.debug( 'using browser' );
    }

    if( !this.ethersProvider && this.provider ){
      //subscribe = true;
      this.ethersProvider = new window.ethers.providers.Web3Provider( this.provider, 'any' );
      this.debug( 'using NETWORK override' );
    }

    if( !this.ethersProvider ){
      this.warn( 'No web3 provider' );
      return false;
    }

    if( !this.contract ){
      //const signer = this.ethersProvider.getSigner();
      this.contract = new window.ethers.Contract( this.contractAddress, this.contractABI, this.ethersProvider );
    }

    try{
      if( !window.ethereum.isConnected() )
        return false;
    }
    catch( err ){
      this.debug({ err })
    }


    //if( subscribe )
    //  this.subscribe();


    if( !(await this.connectChain( deep )) )
      return false;

    if( !(await this.connectAccounts( deep )) )
      return false;

    return true;
  }

  async connectWeb3( deep ){
    //TODO: this.getWeb3Type();

    if( !window.Web3 ){
      try{
        window.Web3 = require( 'web3' );
      }
      catch( err ){
        this.error( "'Web3' is undefined and cannot be imported" );
        return false;
      }
    }

    //let subscribe = false;
    if( window.ethereum && !this.web3client ){
      //subscribe = true;
      this.web3client = new window.Web3( window.ethereum );
      this.debug( 'using browser' );
    }

    if( !this.web3client && this.provider ){
      //subscribe = true;
      this.web3client = new window.Web3( this.provider );
      this.debug( 'using NETWORK override' );
    }

    if( !this.web3client ){
      this.warn( 'No web3 provider' );
      return false;
    }


    if( !this.contract )
      this.contract = new this.web3client.eth.Contract( this.contractABI, this.contractAddress );


    try{
      if( !window.ethereum.isConnected() )
        return false;
    }
    catch( err ){
      this.debug({ err })
    }


    //if( subscribe )
    //  this.subscribe();


    if( !(await this.connectChain( deep )) )
      return false;

    if( !(await this.connectAccounts( deep )) )
      return false;

    return true;
  }

  async connectAccounts( deep ){
    if( this.hasAccounts() )
      return true;

    if( deep ){
      this.wallet.accounts = await this.getWalletAccounts();
      if( this.hasAccounts() )
        return true;
    }

    this.wallet.accounts = await this.getWalletAccounts();
    if( this.hasAccounts() )
      return true;

    if( deep ){
      this.wallet.accounts = await this.requestWalletAccounts();
      return this.hasAccounts();
    }

    return false;
  }

  async connectChain( deep ){
    if( this.isChainConnected() )
      return true;

    if( deep ){
      const chainID = await this.getWalletChainID();
      this.wallet.chain = EthereumSession.getChain( chainID );
      if( this.isChainConnected() )
        return true;
    }

    const chainID = await this.getWalletChainID();
    this.wallet.chain = EthereumSession.getChain( chainID );
    if( this.isChainConnected() )
      return true;

    if( deep ){
      if( await this.setChainID( this.chain.hex ) ){
        const chainID = await this.getWalletChainID();
        this.wallet.chain = EthereumSession.getChain( chainID );
        return this.isChainConnected();
      }

      if( await this.addChain( this.chain ) ){
        const chainID = await this.getWalletChainID();
        this.wallet.chain = EthereumSession.getChain( chainID );
        if( this.isChainConnected() )
          return true;

        if( await this.setChainID( this.chain.hex ) ){
          const chainID = await this.getWalletChainID();
          this.wallet.chain = EthereumSession.getChain( chainID );
          return this.isChainConnected();
        }
      }
    }

    return false;
  }

  static getChain( chainID ){
    if( chainID in EthereumSession.COMMON_CHAINS )
      return EthereumSession.COMMON_CHAINS[ chainID ];

    if( typeof chainID === 'string' ){
      chainID = parseInt( chainID );
      if( chainID in EthereumSession.COMMON_CHAINS )
        return EthereumSession.COMMON_CHAINS[ chainID ];
    }

    return null;
  }

  static getError( err ){
    if( err && err.code === 4001 ){
      err.stack = null;
      return err;
    }
    
    let text = JSON.stringify( err );
    if( text && text !== '{}' )
      return err;


    let newError = null;
    const message = err.message ? err.message : String( err );
    const start = message.indexOf( '{' );
    if( start > -1 ){
      newError = new Error( message.substr( 0, start ).replace( /\s+$/, '' ) );
      if( err.stack ){
        newError.stack = err.stack;
      }

      const end = message.lastIndexOf( '}' );
      if( end > -1 ){
        const json = message.substr( start, end - start + 1 );

        try{
          const unwrapped = JSON.parse( json );
          if( unwrapped.originalError ){
            if( unwrapped.originalError.message === newError.message ){
              newError = unwrapped.originalError;
            }
            else{
              newError.originalError = unwrapped.originalError;
            }
          }
          else{
            if( unwrapped.message === newError.message ){
              newError = unwrapped;
            }
            else{
              newError.originalError = unwrapped;
            }
          }

          return newError;
        }
        catch( innerError ){
          console.warning( innerError );
          debugger;
        }
      }
    }

    return err;
  }

  async getWalletAccounts(){
    const isAllowed = await this.isWalletAllowed();
    if( isAllowed !== false ){
      try{
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        return accounts;
      }
      catch( err ){
        this.warn({ 'getWalletAccounts': JSON.stringify( err ) });
        return [];
      }
    }
    else{
      return [];
    }
  }

  async getWalletChainID(){
    try{
      const chainID = await window.ethereum.request({ method: 'eth_chainId' });
      return chainID;
    }
    catch( err ){
      this.warn({ 'getWalletChainID': JSON.stringify( err ) });
      return null;
    }
  }

  isChainConnected(){
    if( this.wallet.chain )
      return this.wallet.chain.decimal === this.chain.decimal;
    else
      return false;
  }

  isConnected(){
    try{
      if( !window.ethereum.isConnected() )
        return false;
    }
    catch( err ){
      this.debug({ err })
    }

    if( !this.isChainConnected() )
      return false;

    if( !this.hasAccounts() )
      return false;
    
    return true;
  }

  async isWalletAllowed(){
    try{
      const permissions = await window.ethereum.request({ method: 'wallet_getPermissions' })
      return permissions.some( p => p.parentCapability === 'eth_accounts' )
    }
    catch( err ){
      this.warn({ 'isWalletAllowed': JSON.stringify( err ) });
      return null;
    }
  }

  hasAccounts(){
    return !!(this.wallet.accounts && this.wallet.accounts.length)
  }

  //unlock
  async requestWalletAccounts(){
    try{
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      return accounts
    }
    catch( err ){
      if( err.code === -32002 ){
        alert( `Help!  Unlock your wallet and try again.` );
      }
      else if( err.code === 4001 ){
        alert( `Oops!  No account(s) selected, try again.` );
      }
      else{
        this.warn({ 'requestWalletAccounts': err });
        alert( `Oops!  Unknown wallet error, check your wallet and try again.` );
      }
      return []
    }
  }

  async setChainID( hexChainID ){
    try{
      this.lastError = null;
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexChainID }] });
      return true;
    }
    catch( err ){
      this.lastError = err;
      if( err.code === 4001 ){
        //user rejected selection
      }
      else if( err.code === 4902 ){
        //add failed
      }

      return false;
    }
  }

  subscribe(){
    if( window.ethereum ){
      /*
      window.ethereum.on('connect', connectInfo => {
        this.isWeb3Connected = true;
        this.info({ 'isWeb3Connected': this.isWeb3Connected });
      });

      window.ethereum.on('disconnect', () => {
        this.isWeb3Connected = false;
        this.info({ 'isWeb3Connected': this.isWeb3Connected });
      });
      */

      window.ethereum.on('accountsChanged', accounts => {
        this.wallet.accounts = accounts;
      });

      window.ethereum.on('chainChanged', chainID => {
        const chain = EthereumSession.getChain( chainID );
        if( !chain )
          this.warn( `Unknown chain ${chainID}` );

        this.wallet.chain = chain;
      });

      /*
      window.ethereum.on('message', message => {
        if( message.type === 'eth_subscription' ){
          
        }
        else{
          this.debug( message );
        }
      });
      */
    }
  }


  /**
   * logging
   **/
  debug( arg1 ){
    const args = Array.prototype.slice.call( arguments );
    console.debug( ...args );
    this.log( 'DEBUG', ...args );
  }

  error( arg1 ){
    const args = Array.prototype.slice.call( arguments );
    console.error( ...args );
    this.log( 'ERROR', ...args );
  }

  info( arg1 ){
    const args = Array.prototype.slice.call( arguments );
    console.info( ...args );
    this.log( 'INFO', ...args );
  }

  log( severity, arg1 ){
    try{
      const logs = document.getElementById( 'logs' )
      if( logs ){
        const hr = document.createElement( 'hr' );
        logs.appendChild( hr );

        for( let i = 0; i < arguments.length; ++i ){
          const json = document.createTextNode( JSON.stringify( arguments[i] ) )
          logs.appendChild( json )
        }
      }
    }
    catch(_){}
  }

  warn( arg1 ){
    const args = Array.prototype.slice.call( arguments );
    console.warn( ...args );
    this.log( 'WARN', ...args );
  }
}

EthereumSession.COMMON_CHAINS = {
  1: {
    name:    'Ethereum Mainnet',
    decimal:    1,
    hex:     '0x1',
    explorer: 'https://etherscan.io'
  },
  '0x1': {
    name:    'Ethereum Mainnet',
    decimal:    1,
    hex:     '0x1',
    explorer: 'https://etherscan.io'
  },
  3: {
    name:    'Ropsten Testnet',
    decimal:    3,
    hex:     '0x3',
    rpcURL:  'https://ropsten.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'
  },
  '0x3': {
    name:    'Ropsten Testnet',
    decimal:    3,
    hex:     '0x3',
    rpcURL:  'https://ropsten.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'
  },
  4: {
    name:    'Rinkeby Testnet',
    decimal:    4,
    hex:     '0x4',
    rpcURL:  'https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    explorer: 'https://rinkeby.etherscan.io'
  },
  '0x4': {
    name:    'Rinkeby Testnet',
    decimal:    4,
    hex:     '0x4',
    rpcURL:  'https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    explorer: 'https://rinkeby.etherscan.io'
  },
  5: {
    name:    'Goerli Testnet',
    decimal:    5,
    hex:     '0x5',
    rpcURL:  'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'
  },
  '0x5': {
    name:    'Goerli Testnet',
    decimal:    5,
    hex:     '0x5',
    rpcURL:  'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'
  },
  42: {
    name:    'Kovan Testnet',
    decimal:    42,
    hex:     '0x2a',
    rpcURL:  'https://kovan.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'
  },
  '0x2a': {
    name:    'Kovan Testnet',
    decimal:    42,
    hex:     '0x2a',
    rpcURL:  'https://kovan.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'
  },
  56: {
    name:    'Binance Mainnet',
    decimal:    56,
    hex:     '0x38',
    rpcURL:  'https://bsc-dataseed.binance.org/'
  },
  '0x38': {
    name:    'Binance Mainnet',
    decimal:    56,
    hex:     '0x38',
    rpcURL:  'https://bsc-dataseed.binance.org/'
  },
  97: {
    name:    'Binance Testnet',
    decimal:    97,
    hex:     '0x57',
    rpcURL:  'https://data-seed-prebsc-1-s1.binance.org:8545/'
  },
  '0x57': {
    name:    'Binance Testnet',
    decimal:    97,
    hex:     '0x57',
    rpcURL:  'https://data-seed-prebsc-1-s1.binance.org:8545/'
  },
  137: {
    name:    'Polygon (Matic)',
    decimal:    137,
    hex:     '0x89',
    rpcURL:  'https://polygonscan.com/'
  },
  '0x89': {
    name:    'Polygon (Matic)',
    decimal:    137,
    hex:     '0x89',
    rpcURL:  'https://polygonscan.com/'
  },
  80001: {
    name:    'Polygon Mumbai Testnet',
    decimal:     80001,
    hex:     '0x13881',
    rpcURL:  'https://matic-mumbai.chainstacklabs.com/'
  },
  '0x13881': {
    name:    'Polygon Mumbai Testnet',
    decimal:     80001,
    hex:     '0x13881',
    rpcURL:  'https://matic-mumbai.chainstacklabs.com/'
  },
};
  
EthereumSession.IOS_PLATFORMS = [
  'iPad Simulator',
  'iPhone Simulator',
  'iPod Simulator',
  'iPad',
  'iPhone',
  'iPod'
];

class Wallet{
  accounts = [];
  chain    = null;

  constructor(){
    this.accounts = [];
    this.chain = null;
  }
}
