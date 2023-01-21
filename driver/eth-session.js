
class EthereumSession{
	chain           = null;
	contractAddress = null;
	contractABI     = null;
	errors          = {};
	wallet          = null;

	contract        = null;
	provider        = null;

	clientType      = null;
	ethersClient    = null;
	ethersSigner    = null;
	web3client      = null;

	constructor( args ){
		this.chain = args.chain;
		this.contractAddress = args.contractAddress;
		this.contractABI = args.contractABI;
		this.wallet = new Wallet( this );

		if( args.contractABI ){
			const tmp = new Web3();
			const abi = args.contractABI
				.filter( abi => abi.type === 'error' )
				.forEach( abi => {
					const key = tmp.eth.abi.encodeFunctionSignature( `${abi.name}()` );
					this.errors[ key ] = abi;
				});
		}
	}

/*
type: 'ERC20',
options: {
	address: contractAddress,
	symbol:  'ETH',
	decimals: 18,
	image:   'image',
}
*/
	async addAsset( params ){
		try{
      let res;
      if( this.provider.request ){
  			res = await this.provider.request({
  				method: 'wallet_watchAsset',
  				params: params
  			});
      }

			console.info({ res });
			return true;
		}
		catch( err ){
			this.warn( 'addAsset', err );
			return false;
		}
	}

	async addChain( chain ){
		try{
      let res;
			if( this.provider.request ){
        res = await this.provider.request({
					method: 'wallet_addEthereumChain',
					params: [{ 'chainId': chain.hex, 'rpcUrls': chain.rpcURL }]
				});
			}

			return true;
		}
		catch( err ){
			this.warn( 'addChain', err );
			return false;
		}
	}

	async connectEthers( deep, provider ){
		var ethers;

		if( !ethers ){
			try{
				ethers = window.ethers;
				//ethers = require( 'ethers' );
			}
			catch( err ){
				this.error( "'ethers' is undefined and cannot be imported" );
				return false;
			}
		}


		if( provider && provider !== window?.ethereum){
			this.debug( 'using NETWORK override' );
		}
		else if( window?.ethereum ){
			this.debug( 'using browser' );
			provider = window.ethereum;
		}
		else{
			this.error( "no provider" );
			return false;
		}


		if( !this.ethersClient || provider !== this.provider ){
			this.contract = null;
			this.provider = provider;
			//this.ethersClient = new ethers.providers.JsonRpcProvider( provider, 'any' );
			this.ethersClient = new ethers.providers.Web3Provider( provider, 'any' );
		}

		if( !this.ethersClient ){
			this.warn( 'No ethers provider' );
			return false;
		}


		if( !this.contract ){
			this.ethersSigner = this.ethersClient.getSigner();
			this.contract = new ethers.Contract( this.contractAddress, this.contractABI, this.ethersSigner );
		}


		if( !(await this.connectChain( deep )) ){
			return false;
		}

		if( !(await this.connectAccounts( deep )) ){
			return false;
		}


		this.clientType = 'ethers';
		this.wallet.subscribe();
		return true;
	}

	async connectWeb3( deep, provider ){
		var Web3;

		if( !Web3 ){
			try{
				Web3 = window.Web3;
				//Web3 = require( 'web3' );
			}
			catch( err ){
				this.error( "'Web3' is undefined and cannot be imported" );
				return false;
			}
		}


		if( provider && provider !== window?.ethereum){
			this.debug( 'using NETWORK override' );
		}
		else if( window?.ethereum ){
			this.debug( 'using browser' );
			provider = window.ethereum;
		}
		else{
			this.error( "no provider" );
			return false;
		}


		if( !this.web3client || provider !== this.provider ){
			this.contract = null;
			this.provider = provider;
			this.web3client = new Web3( provider );
		}

		if( !this.web3client ){
			this.warn( 'No web3 provider' );
			return false;
		}


		if( !this.contract ){
			this.contract = new this.web3client.eth.Contract( this.contractABI, this.contractAddress );
			this.contract.setProvider( this.provider );
		}


		if( !(await this.connectChain( deep )) ){
			return false;
		}

		if( !(await this.connectAccounts( deep )) ){
			return false;
		}


		this.clientType = 'web3';
    this.ethersClient = null;
		this.wallet.subscribe();
		return true;
	}

	async connectAccounts( deep ){
		if( this.hasAccounts() )
			return true;


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

		let chainID;
		if( deep ){
			chainID = await this.getWalletChainID();
			this.wallet.setChain( EthereumSession.getChain( chainID ) );
			if( this.isChainConnected() )
				return true;
		}

		chainID = await this.getWalletChainID();
		this.wallet.setChain( EthereumSession.getChain( chainID ) );
		if( this.isChainConnected() )
			return true;


		if( deep ){
			if( await this.setChainID( this.chain.hex ) ){
				chainID = await this.getWalletChainID();
				this.wallet.setChain( EthereumSession.getChain( chainID ) );
				return this.isChainConnected();
			}

			if( await this.addChain( this.chain ) ){
				chainID = await this.getWalletChainID();
				this.wallet.setChain( EthereumSession.getChain( chainID ) );
				if( this.isChainConnected() )
					return true;

				if( await this.setChainID( this.chain.hex ) ){
					chainID = await this.getWalletChainID();
					this.wallet.setChain( EthereumSession.getChain( chainID ) );
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

	getClient(){
		if( this.clientType === 'ethers' && this.ethersClient ){
			return this.ethersClient;
		}
		else if( this.clientType === 'web3' && this.web3client){
			return this.web3client;
		}
		else{
			throw new Error( 'Client is not configured' );
		}
	}

	getContract(){
		if( this.clientType === 'ethers' && this.contract){
			return this.contract;
		}
		else if( this.clientType === 'web3' && this.contract){
			return this.contract;
		}
		else{
			throw new Error( 'Contract is not configured' );
		}
	}

	async getWalletAccounts(){
		const isAllowed = await this.isWalletAllowed();
		if( isAllowed !== false ){
			try{
				let accounts = [];
				if( this.ethersClient ){
					try{
						accounts = await this.ethersClient.listAccounts();
					}
					catch( err ){
						this.warn( 'getWalletAccounts::ethers', err );
					}
				}

				if( !accounts?.length && this.web3client ){
					accounts = await this.web3client.eth.getAccounts();
				}

				if( !accounts?.length && this.provider.request ){
					accounts = await this.provider.request({ method: 'eth_accounts' });
				}

				return accounts;
			}
			catch( err ){
				this.warn( 'getWalletAccounts', err );
				return [];
			}
		}
		else{
			return [];
		}
	}

	async getWalletChainID(){
		try{
			let chainID;
			if( this.ethersClient ){
				try{
					const network = await this.ethersClient.getNetwork();
					debugger;
					chainID = network.chainId;
				}
				catch( err ){
  				this.warn( 'getWalletChainID::ethers', err );
				}
			}

			if( !chainID && this.web3client ){
				chainID = await this.web3client.eth.getChainId();
			}

			if( !chainID && this.provider.request ){
				chainID = await this.provider.request({ method: 'eth_chainId' });
			}

			return chainID;
		}
		catch( err ){
			this.warn( 'getWalletChainID', err );
			return null;
		}
	}

	isChainConnected(){
		const chain = this.wallet.getChain();
		if( chain )
			return chain.decimal === this.chain.decimal;
		else
			return false;
	}

	isConnected(){
		try{
			if( !window.ethereum.isConnected() )
				return false;
		}
		catch( err ){
			this.debug( err );
		}

		if( !this.isChainConnected() )
			return false;

		if( !this.hasAccounts() )
			return false;

		return true;
	}

	async isWalletAllowed(){
		try{
			if( this.provider === window?.ethereum ){
				const permissions = await this.provider.request({ method: 'wallet_getPermissions' });
				return permissions.some( p => p.parentCapability === 'eth_accounts' );
			}			
		}
		catch( err ){
			this.warn( 'isWalletAllowed', err );
		}

		return null;
	}

	hasAccounts(){
		return !!(this.wallet.accounts && this.wallet.accounts.length)
	}

	//unlock
	async requestWalletAccounts(){
		try{
			let accounts = []
			if( this.ethersClient ){
				try{
					accounts = await this.ethersClient.listAccounts();
				}
				catch( err ){
  				this.warn( 'requestWalletAccounts::ethers', err );
				}
			}

			if( !accounts?.length && this.web3client ){
				accounts = await this.web3client.eth.getAccounts();
			}

			if( !accounts?.length && this.provider.request ){
				accounts = await this.provider.request({ method: 'eth_requestAccounts' });
			}

			return accounts
		}
		catch( err ){
			if( err.code === -32002 ){
				//alert( `Help!  Unlock your wallet and try again.` );
			}
			else if( err.code === 4001 ){
				//alert( `Oops!  No account(s) selected, try again.` );
			}
			else{
				this.warn( 'requestWalletAccounts', err );
				//alert( `Oops!  Unknown wallet error, check your wallet and try again.` );
			}
			return []
		}
	}

	async setChainID( hexChainID ){
		try{
      let res;
			if( this.provider.request ){
				res = await this.provider.request({
					method: 'wallet_switchEthereumChain',
					params: [{ chainId: hexChainID }]
				});
			}

			return true;
		}
		catch( err ){
			if( err.code === 4001 ){
				//user rejected selection
			}
			else if( err.code === 4902 ){
				//add failed
			}

			return false;
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
					this.warn( innerError );
				}
			}
		}

		return err;
	}

	async createTypedData( primaryType, message, types, domainName ){
		//TODO: require primaryType in types

		const domain = await this.getContractDomain( domainName );
		types.EIP712Domain = [
			{ name: 'name', type: 'string' },
			{ name: 'chainId', type: 'uint256' },
			{ name: 'version', type: 'string' },
			{ name: 'verifyingContract', type: 'address' },
		];

		const typedData = {
			primaryType,
			domain,
			types,
			message
		};
		return typedData;
	}
	
	async getContractDomain( domainName ){
		if( !domainName ){
			try{
				const name = await this.contract.methods.name().call();
				return {
					name:                              name,
					version:                            '1',
					chainId:             this.chain.decimal,
					verifyingContract: this.contractAddress
				};
			}
			catch( err ){
				console.error( `Address ${this.contractAddress} does not have "name" function` );
				this.warn({ err });
			}
		}

		return {
			name:                        domainName,
			version:                            '1',
			chainId:             this.chain.decimal,
			verifyingContract: this.contractAddress
		};
	}

	async signTypedData( typedData ){
		try{
			const signer = this.wallet.accounts[0];
			const request = {
				method: 'eth_signTypedData_v4',
				from:   signer,
				params: [ signer.toLowerCase(), JSON.stringify( typedData ) ]
			};

			const signature = await this.provider.request( request );
			//const signature = await provider.send( request );
			return signature;
		}
		catch( err ){
			console.warn({ err });
			throw err;
		}
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
		rpcURL:  'https://ropsten.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
		explorer: 'https://ropsten.etherscan.io'
	},
	'0x3': {
		name:    'Ropsten Testnet',
		decimal:    3,
		hex:     '0x3',
		rpcURL:  'https://ropsten.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
		explorer: 'https://ropsten.etherscan.io'
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
		rpcURL:  'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
		explorer: 'https://goerli.etherscan.io'
	},
	'0x5': {
		name:    'Goerli Testnet',
		decimal:    5,
		hex:     '0x5',
		rpcURL:  'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
		explorer: 'https://goerli.etherscan.io'
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
		rpcURL:  'https://data-seed-prebsc-1-s1.binance.org:8545/',
		explorer: 'https://testnet.bscscan.com/'
	},
	'0x57': {
		name:    'Binance Testnet',
		decimal:    97,
		hex:     '0x57',
		rpcURL:  'https://data-seed-prebsc-1-s1.binance.org:8545/',
		explorer: 'https://testnet.bscscan.com/'
	},
	137: {
		name:    'Polygon (Matic)',
		decimal:    137,
		hex:     '0x89',
		rpcURL:  'https://polygonscan.com/',
		explorer:  'https://polygonscan.com/'
	},
	'0x89': {
		name:    'Polygon (Matic)',
		decimal:    137,
		hex:     '0x89',
		rpcURL:  'https://polygonscan.com/',
		explorer:  'https://polygonscan.com/'
	},

	71401: {
		name:    'Nervos Testnet',
		decimal:  71401,
		hex:     '0x116e9',
		rpcURL:  'https://godwoken-testnet-v1.ckbapp.dev'
	},
	'0x116e9': {
		name:    'Nervos Testnet',
		decimal:  71401,
		hex:     '0x116e9',
		rpcURL:  'https://godwoken-testnet-v1.ckbapp.dev'
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
	11155111: {
		name:    'Sepolia Testnet',
		decimal:     11155111,
		hex:     '0xaa36a7',
		rpcURL:  'https://sepolia.etherscan.io/',
		explorer: 'https://sepolia.etherscan.io'
	},
	'0xaa36a7': {
		name:    'Sepolia Testnet',
		decimal:     11155111,
		hex:     '0xaa36a7',
		rpcURL:  'https://sepolia.etherscan.io/',
		explorer: 'https://sepolia.etherscan.io'
	}
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
	handlers = {};

	constructor( session ){
		this.accounts = [];
		this.chain = null;
		this.session = session;

		this.handlers = {};
		this.handleAccountsChanged = this.handleAccountsChanged.bind( this );
		this.handleChainChanged = this.handleChainChanged.bind( this );
	}

	setAccounts( accounts ){
		if( accounts && accounts.length )
			this.accounts = [...accounts];
		else
			this.accounts = accounts;

		this.trigger( 'accountsChanged', this.session );
	}

	getChain(){
		return this.chain ? {...this.chain} : null;
	}

	handleAccountsChanged( accounts ){
		this.setAccounts( accounts );
		this.session.provider.once( 'accountsChanged', this.handleAccountsChanged.bind( this ) );
	}

	handleChainChanged( chainID ){
		const chain = EthereumSession.getChain( chainID );
		if( chain ){
			this.setChain( chain );
		}
		else{
			this.session.warn( `Unknown chain ${chainID}` );
		}

		this.session.provider.once( 'chainChanged', this.handleChainChanged );
	}

	on( eventName, callback ){
		if( !(eventName in this.handlers) )
			this.handlers[ eventName ] = [];

		this.handlers[ eventName ].push( callback );
		return this;
	}

	setChain( chain ){
		this.chain = chain ? {...chain} : chain;
	}

	subscribe(){
		try{
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

			if( this.session.provider?.once ){
			  this.session.provider.once( 'accountsChanged', this.handleAccountsChanged.bind( this ) );
			  this.session.provider.once( 'chainChanged', this.handleChainChanged.bind( this ) );
			}

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
		catch( err ){
			console.warn( err );
		}
	}

	trigger( eventName, ...args ){
		if( eventName in this.handlers && this.handlers[ eventName ] ){
			for( let handler of this.handlers[ eventName ] ){
				try{
					handler( ...args );
				}
				catch( err ){
					console.warn({ eventName: err });
				}
			}
		}
	}
}
