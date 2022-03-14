
class EthereumDriver{
	instance = null;
	session = null;

	configFilters = {
		regex: /.*/,
		stateMutability: [
			'nonpayable',
			'payable',
			'pure',
			'view'
		],
		types: [
			'event',
			'function'
		]
	};

	recentFilters = {
		chain:  null,
		name:   /.*/,
		symbol: /.*/
	};

	constructor( args ){
		EthereumDriver.instance = this;
		
		try{
			this.session = new EthereumSession( args );
		}
		catch( err ){
			throw new Error( 'EthereumSession not defined' );
		}
	}

	static timeouts = {};
	static debounce( key, delay, callback ){
		if( EthereumDriver.timeouts[ key ] ){
			clearTimeout( EthereumDriver.timeouts[ key ] );
			EthereumDriver.timeouts[ key ] = null;
		}
		EthereumDriver.timeouts[ key ] = setTimeout( callback, delay );
	}

	deleteAddress( address, chainID ){
		if( confirm( `Delete contract ${address} from local storage?` ) ){
			let json = localStorage.getItem( 'EthereumDriver.contracts' );
			if( json ){
				let contracts = Object.values( JSON.parse( json ) );
				contracts = contracts.filter( c => !( c.address === address && c.chainID === chainID ) );
				json = JSON.stringify( contracts );
				localStorage.setItem( 'EthereumDriver.contracts', json );
				localStorage.removeItem( address );

				EthereumDriver.populateRecentContracts( this.recentFilters );
			}

			let contract = localStorage.getItem( address );
			if( contract ){
				contract = JSON.parse( contract );
				if( contract.address === address && contract.chainID === chainID )
					localStorage.removeItem( address );
			}
		}
	}

	async execute( evt, type ){
		EthereumDriver.preventDefault( evt );
		if( !(await this.session.connectWeb3( true )) )
			return;


		const form = evt.target.form;
		const name = EthereumDriver.getFormName( form );
		const args = EthereumDriver.getFormArgs( form );

		const options1559 = {
			'from': this.session.wallet.accounts[0]
		};

		//clone
		const abi = Object.assign({},form.attributes['data-abi']);
		if( abi.stateMutability === 'payable' ){
			const value = form.querySelector( 'input.value' ).value;
			if( value ){
				options1559.value = Web3.utils.toWei( value, 'ether' );
			}
		}
		
		

		const session = this.session;
		const requestDate = new Date();
		const method = this.session.contract.methods[ name ]( ...args );
		
		try{
			let args;
			try{
				const options1559E = Object.assign({}, options1559);
				args = await method.estimateGas( options1559E );
			}
			catch( err ){
				if( err.code && err.code === -32602 ){
					const optionsType1 = Object.assign({}, options1559);
					optionsType1.type = '0x1';

					args = await method.estimateGas( optionsType1 );
				}
				else
					throw err
			}

			if( type !== 'estimateGas' ){
					try{
						args = await method[ type ]( options1559 );
					}
					catch( err ){
						if( err.code && err.code === -32602 ){
							const optionsType1 = Object.assign({}, options1559);
							optionsType1.type = '0x1';

							args = await method[ type ]( optionsType1 );
						}
						else
								throw err
					}
			}

			let response;
			const responseDate = new Date();
			if( type === 'estimateGas' ){
				//gwei
				let gasPrice = 1
				if( type === 'estimateGas' ){
					const tmp = await session.web3client.eth.getGasPrice();
					gasPrice = Web3.utils.fromWei( `${tmp}`, 'gwei' );
				}

				response = args;
			}
			else if( abi.outputs && abi.outputs.length ){
				if( abi.outputs.length === 1  ){
					args = [ args ];
				}
				else{
					args.length = abi.outputs.length;
					args = Array.prototype.slice.call( args );
				}

				const isAllKeys = abi.outputs.every( o => !!o.name );
				response = (abi.outputs.length && isAllKeys) ? {} : [];
			
				//TODO: EthereumDriver.formatResponse( arguments )
				args.forEach(( arg, i ) => {
					const op = abi.outputs[i];
					arg = EthereumDriver.formatArgument( abi, arg, i );
					if( isAllKeys && op.name ){
						response[op.name] = arg;
					}
					else{
						response.push( arg );
					}
				});

				if( response.length && response.length == 1 )
					response = response[0];
			}
			else{
				response = args;
			}

			const responseData = JSON.stringify( response, null, '  ' );
			const responseDiv = form.parentElement.querySelector( 'div.results' );
			responseDiv.style.color = '#000';
			responseDiv.innerHTML = `${responseDate.getTime()}<br />${responseDate.toISOString()}<hr /><div class="output">${responseData}</div>`;
		}
		catch( err ){
			const responseDate = new Date();
			const error = EthereumSession.getError( err );

			const responseData = JSON.stringify( error, null, '  ' );
			const responseDiv = form.parentElement.querySelector( 'div.results' );
			responseDiv.style.color = '#f66';
			responseDiv.innerHTML = `${responseDate.getTime()}<br />${responseDate.toISOString()}<hr /><div class="output">${responseData}</div>`;
		}
	}

	static formatArgument( abi, arg, i ){
		const op = abi.outputs[i];
		//args.forEach(( arg, i ) => {
		//let op = abi.outputs[i];
		if( op.type.substring( 0, 3 ).toLowerCase() === 'int' )
			op.type = 'int';
		else if( op.type.substring( 0, 4 ).toLowerCase() === 'uint' )
			op.type = 'uint';

		switch( op.type ){
			case 'address':
			case 'bool':
			case 'string':
				return arg;

			case 'int':
			case 'uint':
				if( Array.isArray( arg ) )
					return arg.map( EthereumDriver.formatInt );
				else
					return EthereumDriver.formatInt( arg );

			default:
				console.warn( op.type );
					return arg;
		}
	}

	static formatInt( arg ){
		if( arg.length <= 16 ){
			const tmp = parseInt( arg );
			if( !`${tmp}`.includes( '.' ) )
				arg = tmp;
		}

		return arg;
	}

	static filter( configFilters ){
		const forms = Array.prototype.slice.call( document.getElementsByTagName( 'form' ) );
		forms.forEach( f => {
			const abi = f.attributes['data-abi'];
			if( abi.type === 'event' ){
				const show = configFilters.regex.test( abi.name ) && configFilters.types.includes( 'event' );
				f.parentElement.style.display = show ? 'block' : 'none';
			}
			else if( abi.type === 'function' ){
				const show = configFilters.regex.test( abi.name ) && configFilters.stateMutability.includes( abi.stateMutability );
				f.parentElement.style.display = show ? 'block' : 'none';
			}
		})
	}

	static getDataAttrInt( obj, attr, radix ){
		const value = EthereumDriver.getDataAttr( obj, attr );
		if( isNaN( value ) )
			return NaN;

		if( !radix )
			radix = 10;

		return parseInt( value, radix );
	};

	static getDataAttr( obj, attr ){
		return obj.getAttribute( attr );
	};

	static isArg( input ){
		if( input.name[0] === '$' ||
			input.type === 'hidden' ||
			input.attributes['data-index'] === undefined )
			return false;

		return input.type === 'text';
	}

	static getFormArgs( form, remainder ){
		const args = [];
		const options = [];
		for( let i = 0; i < form.length; ++i ){
			const input = form[i];
			const arg = {
				'name': input.name || `${args.length}`
			};

			try{
				arg.value = JSON.parse( input.value );
				
				//revert to string format in case of long numbers
				if( ![ 'boolean', 'object', 'string' ].includes( typeof arg.value ) )
					arg.value = input.value;
			}
			catch( err ){
				arg.value = input.value;
			}

			if( EthereumDriver.isArg( input ) ){
				arg.index = parseInt( input.attributes['data-index'] );
				args.push( arg );
			}
			else{
				options.push( arg );
			}
		}

		if( Array.isArray( remainder ) ){
			remainder.push( ...options );
		}

		args.sort(( left, right ) => {
			if( left.index < right.index )
				return -1;
			else if( left.index > right.index )
				return 1;
			else
				return 0;
		});

		return args.map( a => a.value );
	}

	static getFormName( form ){
		for( let i = 0; i < form.length; ++i ){
			const input = form[i];
			if( input.name === 'name' )
				return input.value;
		}

		return null;
	}

	async getFirstBlock(){
		const abi = this.session.contractABI.find( rpc => rpc.name == 'OwnershipTransferred' );
		if( !abi )
			return null;


		const hash = this.session.web3client.eth.abi.encodeEventSignature( abi );
		const subArgs = {
			address: this.session.contractAddress,
			fromBlock: 0,
			topics: [
				hash
			]
		};

		const firstBlock = await this.session.web3client.eth.getPastLogs( subArgs );
		if( firstBlock.length ){
			console.info({ firstBlock: firstBlock[0].blockNumber });
			return firstBlock[0].blockNumber;
		}
		else{
			return null;
		}
	}

	async getLastBlock(){
		const lastBlock = await this.session.web3client.eth.getBlockNumber();
		console.info({ lastBlock });
		return lastBlock;
	}

	async load( chainID, address, abiJson, save ){
		let chain;
		if( chainID in EthereumSession.COMMON_CHAINS ){
			chain = EthereumSession.COMMON_CHAINS[ chainID ];
		}
		else{
			alert( `Unsupported network: ${chainID}` );
			return;
		}

		//TODO: check address

		let abi;
		try{
			abi = JSON.parse( abiJson );
		}
		catch( err ){
			alert( `Invalid ABI JSON` );
			return;
		}

		this.session = new EthereumSession({
			chain:           chain,
			contractAddress: address,
			contractABI:     abi
		});

		await this.session.connectWeb3( true );
		if( save ){
			this.saveContract( chainID, address, JSON.stringify( abi ) );
		}

		await this.renderAll();
		this.showConfig( false );
		EthereumDriver.filter( this.configFilters );

		const contractEl = document.getElementById( 'contract' );
		if( contractEl ){
			contractEl.style.display = 'block';
		}
	}

	loadAddress( address ){
		let contract = localStorage.getItem( address );
		if( contract ){
			contract = JSON.parse( contract );
			this.load( contract.chainID, contract.address, contract.abiJson, false );
		}
	}

	async loadFile(){
		const chainID = document.getElementById( 'contract-network' ).value;
		const contractAddress = document.getElementById( 'contract-address' ).value;
		const abiFile = document.getElementById( 'contract-abi-file' );
		const abiJson = await abiFile.files[0].text();

		this.load( chainID, contractAddress, abiJson, true );
	}

	loadJson(){
		const chainID = document.getElementById( 'contract-network' ).value;
		const contractAddress = document.getElementById( 'contract-address' ).value;
		const abiJson = document.getElementById( 'contract-abi-json' ).value;

		this.load( chainID, contractAddress, abiJson, true );
	}

	loadTemplate(){
		const chainID = document.getElementById( 'contract-network' ).value;
		const contractAddress = document.getElementById( 'contract-address' ).value;
		const abiTemplate = document.getElementById( 'contract-abi-template' ).value;
		if( abiTemplate in EthereumDriver.TEMPLATES ){
			const abiJson = JSON.stringify( EthereumDriver.TEMPLATES[ abiTemplate ] );
			this.load( chainID, contractAddress, abiJson, true );
		}
		else{
			alert( `Invalid/Unsupported template: ${abiTemplate}` );
		}

		document.getElementById( 'contract-abi-template' ).value = '';
	}

	static parseRegex( regex, pattern, flags ){
		if( regex ){
			pattern = regex;
			const groups = /^\/([^\/]+)\/([dgimsuy]*)$/.exec( regex );
			if( groups && groups.length === 3 ){
				pattern = groups[1];
				flags = groups[2];
			}
		}
		return new RegExp( pattern, flags );
	}

	static populateRecentContracts( filters ){
		const recentTable = document.getElementById( 'recent-contracts' );
		if( !recentTable )
			return;
			

		let json = localStorage.getItem( 'EthereumDriver.contracts' );
		if( !json )
			return;


		if( !filters )
			filters = {};

		let contracts = Object.values( JSON.parse( json ) );
		if( filters.chain )
			contracts = contracts.filter( c => c.chainID == filters.chain );

		if( filters.name )
			contracts = contracts.filter( c => filters.name.test( c.name ) );

		if( filters.symbol )
			contracts = contracts.filter( c => filters.symbol.test( c.symbol ) );

		contracts.sort(( left, right ) => {
			if( left.created < right.created )
				return 1;

			if( left.created > right.created )
				return -1;

			//TODO: accessed

			return 0;
		});

		let html = '';
		for( let contract of contracts ){
			let chain = '(unknown)';
			if( contract.chainID ){
				chain = EthereumSession.COMMON_CHAINS[ contract.chainID ].name;
			}

			html += `<tr id="${contract.address}">`
					+'<td align="center">'
						+'<a class="delete-contract" href="#" data-chain="'+ contract.chainID +'" data-address="'+ contract.address +'">'
							+'&times</a></td>'
					+`<td class="date">${(new Date( contract.created )).toISOString().replace( 'T', ' ' ).replace( 'Z', '' )}</td>`
					+`<td>${chain}</td>`
					+`<td>${contract.address}</td>`
					+`<td>${contract.name}</td>`
					+`<td>${contract.symbol}</td>`
					+'<td><a href="#" class="load-contract">Load</td>'
				+'</tr>';
		}
		recentTable.tBodies[0].innerHTML = html;
	}

	static preventDefault( evt ){
		if( evt && evt.cancelable )
			evt.preventDefault();
	}

	//TODO: run-once
	registerEvents(){
		this.registerFilterEvents();
		this.registerLoadEvents();
		this.registerRecentEvents();


		//dynamic events
		document.addEventListener( 'click', evt => {
			if( evt.target.nodeName === 'A' ){
				if( evt.target.classList.contains( 'delete-contract' ) ){
					EthereumDriver.preventDefault( evt );
					const address = EthereumDriver.getDataAttr( evt.target, 'data-address' );
					const chainID = EthereumDriver.getDataAttr( evt.target, 'data-chain' );
					this.deleteAddress( address, chainID );
				}
				if( evt.target.classList.contains( 'load-contract' ) ){
					EthereumDriver.preventDefault( evt );
					const address = evt.target.parentElement.parentElement.id;
					this.loadAddress( address );
				}
			}
		});
		
		
		//TODO: move this into config
		const changeWallet = document.getElementById( 'change-wallet' );
		if( changeWallet ){
			changeWallet.addEventListener( 'click', async (evt) => {
				EthereumDriver.preventDefault( evt );
				this.session.wallet.accounts = await this.session.requestWalletAccounts();
			});
		}

		if( window.ethereum ){
			window.ethereum.on('accountsChanged', async (accounts) => {
				this.session.wallet.accounts = accounts;
			});
		}
	}

	registerFilterEvents(){
		const filterEl = document.getElementById( 'filter' );
		if( filterEl ){
			filterEl.addEventListener( 'keydown', evt => {
				if( evt.key === "Escape" ){
					evt.target.value = '';
					this.configFilters.regex = /.*/;
				}
				else if( evt.key === "Enter" ){
					this.configFilters.regex = EthereumDriver.parseRegex( evt.target.value, '.*', 'i' );
				}

				EthereumDriver.filter( this.configFilters );
			});
		}

		const greenButton = document.querySelector( '#filter-container .green' );
		if( greenButton ){
			greenButton.addEventListener( 'click', evt => {
				if( greenButton.classList.toggle( 'active' ) ){
					if( !this.configFilters.types.includes( 'event' ) )
						this.configFilters.types.push( 'event' );
				}
				else{
					let at = this.configFilters.types.indexOf( 'event' );
					if( at > -1 )
						this.configFilters.types.splice( at, 1 );
				}

				EthereumDriver.filter( this.configFilters );
			})
		}

		const blueButton = document.querySelector( '#filter-container .blue' );
		if( blueButton ){
			blueButton.addEventListener( 'click', evt => {
				if( blueButton.classList.toggle( 'active' ) ){
					if( !this.configFilters.stateMutability.includes( 'pure' ) )
						this.configFilters.stateMutability.push( 'pure' );

					if( !this.configFilters.stateMutability.includes( 'view' ) )
						this.configFilters.stateMutability.push( 'view' );
				}
				else{
					let at = this.configFilters.stateMutability.indexOf( 'pure' )
					if( at > -1 )
						this.configFilters.stateMutability.splice( at, 1 );

					at = this.configFilters.stateMutability.indexOf( 'view' )
					if( at > -1 )
						this.configFilters.stateMutability.splice( at, 1 );
				}

				EthereumDriver.filter( this.configFilters );
			})
		}

		const yellowButton = document.querySelector( '#filter-container .yellow' );
		if( yellowButton ){
			yellowButton.addEventListener( 'click', evt => {
				if( yellowButton.classList.toggle( 'active' ) ){
					if( !this.configFilters.stateMutability.includes( 'nonpayable' ) )
						this.configFilters.stateMutability.push( 'nonpayable' );
				}
				else{
					const at = this.configFilters.stateMutability.indexOf( 'nonpayable' );
					if( at > -1 )
						this.configFilters.stateMutability.splice( at, 1 );
				}

				EthereumDriver.filter( this.configFilters );
			})
		}

		const redButton = document.querySelector( '#filter-container .red' );
		if( redButton ){
			redButton.addEventListener( 'click', evt => {
				if( redButton.classList.toggle( 'active' ) ){
					if( !this.configFilters.stateMutability.includes( 'payable' ) )
						this.configFilters.stateMutability.push( 'payable' );
				}
				else{
					const at = this.configFilters.stateMutability.indexOf( 'payable' )
					if( at > -1 )
						this.configFilters.stateMutability.splice( at, 1 );
				}

				EthereumDriver.filter( this.configFilters );
			});
		}
	}

	registerLoadEvents(){
		const configEl = document.getElementById( 'filter-container' ).querySelector( '.gear' )
		if( configEl ){
			configEl.addEventListener( 'click', evt => {
				EthereumDriver.preventDefault( evt );
				this.showConfig();
			});
		}


		const recentTab = document.getElementById( 'recent-tab' );
		if( recentTab ){
			recentTab.addEventListener( 'click', evt => {
				EthereumDriver.preventDefault( evt );
				this.showTab( recentTab.id );
			});
		}


		const fileTab = document.getElementById( 'file-tab' );
		if( fileTab ){
			fileTab.addEventListener( 'click', evt => {
				EthereumDriver.preventDefault( evt );
				this.showTab( fileTab.id, 'file' );
			});
		}


		const jsonTab = document.getElementById( 'json-tab' );
		if( jsonTab ){
			jsonTab.addEventListener( 'click', evt => {
				EthereumDriver.preventDefault( evt );
				this.showTab( jsonTab.id, 'json' );
			});
		}


		const templateTab = document.getElementById( 'template-tab' );
		if( templateTab ){
			templateTab.addEventListener( 'click', evt => {
				EthereumDriver.preventDefault( evt );
				this.showTab( templateTab.id, 'template' );
			});
		}


		const contractBtn = document.getElementById( 'btn-load-contract' );
		if( contractBtn ){
			contractBtn.addEventListener('click', evt => {
				EthereumDriver.preventDefault( evt );
				const abiFile = document.getElementById( 'contract-abi-file' ).value;
				if( abiFile ){
					this.loadFile();
					return;
				}

				const abiJson = document.getElementById( 'contract-abi-json' ).value;
				if( abiJson ){
					this.loadJson();
					return;
				}

				const abiTemplate = document.getElementById( 'contract-abi-template' ).value;
				if( abiTemplate ){
					this.loadTemplate();
					return;
				}

				alert( 'No ABI' );
			});
		}
	}

	registerRecentEvents(){
		const recentNetwork = document.getElementById( 'recent-network' );
		if( recentNetwork ){
			recentNetwork.addEventListener( 'change', evt => {
				EthereumDriver.debounce( 'recent', 200, () => {
					this.recentFilters.chain = recentNetwork.value;
					EthereumDriver.populateRecentContracts( this.recentFilters );
				})
			});
		}


		const recentName = document.getElementById( 'recent-name' );
		if( recentName ){
			recentName.addEventListener( 'change', evt => {
				EthereumDriver.debounce( 'recent', 200, () => {
					this.recentFilters.name = EthereumDriver.parseRegex( recentName.value, '.*', 'i' );
					EthereumDriver.populateRecentContracts( this.recentFilters );
				});
			});

			recentName.addEventListener( 'keydown', evt => {
				if( evt.key === "Escape" ){
					evt.target.value = '';
					this.recentFilters.name = /.*/i;
					EthereumDriver.populateRecentContracts( this.recentFilters );
				}
			});
		}

		const recentSymbol = document.getElementById( 'recent-symbol' );
		if( recentSymbol ){
			recentSymbol.addEventListener( 'change', evt => {
				EthereumDriver.debounce( 'recent', 200, () => {
					this.recentFilters.symbol = EthereumDriver.parseRegex( recentSymbol.value, '.*', 'i' );
					EthereumDriver.populateRecentContracts( this.recentFilters );
				});
			});

			recentSymbol.addEventListener( 'keydown', evt => {
				if( evt.key === "Escape" ){
					evt.target.value = '';
					this.recentFilters.symbol = /.*/i;
					EthereumDriver.populateRecentContracts( this.recentFilters );
				}
			});
		}
	}

	async renderAll(){
		//HEADER

		//TODO: owner()
		//TODO: if correct chain
		if( this.session.chain && this.session.chain.name ){
			const network = this.session.chain.name +' ('+ this.session.chain.decimal +')';
			document.getElementById( 'contract-detail' ).querySelector( '.network' ).innerHTML = this.session.chain.name;
		}
		else{
			document.getElementById( 'contract-detail' ).querySelector( '.network' ).innerHTML = '(unknown)';
		}

		try{
			const name = await this.session.contract.methods.name().call();
			document.getElementById( 'contract-header' ).querySelector( '.name' ).innerText = name;
		}
		catch( err ){
			this.session.warn( err );
			document.getElementById( 'contract-header' ).querySelector( '.name' ).innerText = '(unknown)';
		}


		try{
			const symbol = await this.session.contract.methods.symbol().call();
			document.getElementById( 'contract-header' ).querySelector( '.symbol' ).innerText = `(${symbol})`;
		}
		catch( err ){
			this.session.warn( err );
			document.getElementById( 'contract-header' ).querySelector( '.symbol' ).innerText = '';
		}


		try{
			const owner = await this.session.contract.methods.owner().call();
			document.getElementById( 'contract-detail' ).querySelector( '.owner' ).innerText = owner;
		}
		catch( err ){
			this.session.warn( err );
			document.getElementById( 'contract-detail' ).querySelector( '.owner' ).innerText = '(unknown)';
		}


		try{
			let address = this.session.contractAddress;
			if( this.session.chain.explorer ){
				address += `&#8203; <small>(<a href="${this.session.chain.explorer}/address/${this.session.contractAddress}" target="_blank">Etherscan</a>)</small>`;
			}

			document.getElementById( 'contract-detail' ).querySelector( '.address' ).innerHTML = address;
		}
		catch( err ){
			document.getElementById( 'contract-detail' ).querySelector( '.address' ).innerHTML = '';
			//log the error
		}



		//EVENTS
		const outputEl = document.getElementById( 'events-content' );
		outputEl.innerHTML = '';

		const events = this.session.contractABI.filter( item => item.type === 'event' );
		events.sort(( l, r ) => {
			if( l.name < r.name )
				return -1;

			if( l.name > r.name )
				return 1;

			return 0;
		});
		events.forEach( evt => {
			const el = this.renderEvent( evt );
			if( el )
				outputEl.appendChild( el );
		});


		//FUNCTIONS
		const readersEl = document.getElementById( 'readers-content' );
		readersEl.innerText = '';

		const writersEl = document.getElementById( 'writers-content' );
		writersEl.innerText = '';

		const mintersEl = document.getElementById( 'minters-content' );
		mintersEl.innerText = '';

		const functions = this.session.contractABI.filter( item => item.type === 'function' );
		functions.sort(( l, r ) => {
			if( l.name < r.name )
				return -1;

			if( l.name > r.name )
				return 1;

			return 0;
		});

		functions.forEach( func => {
			const el = this.renderRPC( func )
			if( el ){
				switch( func.stateMutability ){
					case 'nonpayable':
						writersEl.appendChild( el );
						break;

					case 'payable':
						mintersEl.appendChild( el );
						break;

					case 'pure':
					case 'view':
						readersEl.appendChild( el )
						break;

					default:
						alert('wth');
						debugger;
				}
			}
		});
	}

	renderEvent( eventAbi ){
		const legend = document.createElement( 'legend' );
		legend.innerText = eventAbi.name;

		//const inputs = [];
		const inputs = eventAbi.inputs.map(( input, index ) => {
			const label = document.createElement( 'label' );
			label.innerText = `${input.name}: `;

			const inputEl = document.createElement( 'input' );
			inputEl.name = input.name;
			inputEl.type = 'text';
			inputEl.innerText = input.name;
			inputEl.placeholder = `${input.name} (${input.type})`;
			inputEl.className = input.type;
			inputEl.attributes['data-index'] = index;

			const span = document.createElement( 'span' );
			span.appendChild( label );
			span.appendChild( inputEl );

			return span;
		});


		const nameInput = document.createElement( 'input' );
		nameInput.name = 'name';
		nameInput.type = 'hidden';
		nameInput.value = eventAbi.name;
		inputs.unshift( nameInput );


		const searchButton = document.createElement( 'button' );
		searchButton.className = 'event-search';
		searchButton.innerText = 'Search';
		searchButton.addEventListener( 'click', evt => this.searchLogs( evt, eventAbi ));

		const subscribeButton = document.createElement( 'button' );
		subscribeButton.className = 'event-subscribe';
		subscribeButton.innerText = 'Subscribe';
		subscribeButton.addEventListener( 'click', evt => this.subscribe( evt, eventAbi ));

		const form = document.createElement( 'form' );
		form.attributes['data-abi'] = eventAbi;
		form.addEventListener( 'submit', EthereumDriver.preventDefault );
		


		//if( funcAbi.stateMutability === 'payable' ){
			const hr = document.createElement( 'hr' );
			inputs.push( hr );

			//from block
			//TODO: firstBlock button
			//const firstBlock = await this.getFirstBlock();
				const label = document.createElement( 'label' );
				label.innerText = `from: `;

				const valueInput = document.createElement( 'input' );
				valueInput.className = 'value';
				valueInput.name = '$from';
				valueInput.placeholder = 'block ID';
				valueInput.type = 'text';

				const span = document.createElement( 'span' );
				span.appendChild( label );
				span.appendChild( valueInput );

				inputs.push( span );
				

			//to block
			//TODO: lastBlock button
			//const lastBlock = await this.getLastBlock();
				const label2 = document.createElement( 'label' );
				label2.innerText = `to: `;

				const valueInput2 = document.createElement( 'input' );
				valueInput2.className = 'value';
				valueInput2.name = '$to';
				valueInput2.placeholder = 'block ID';
				valueInput2.type = 'text';

				const span2 = document.createElement( 'span' );
				span2.appendChild( label2 );
				span2.appendChild( valueInput2 );

				inputs.push( span2 );


				//step size
				const label3 = document.createElement( 'label' );
				label3.innerText = `step: `;

				const valueInput3 = document.createElement( 'input' );
				valueInput3.className = 'value';
				valueInput3.name = '$step';
				valueInput3.placeholder = 'block quantity';
				valueInput3.type = 'text';

				const span3 = document.createElement( 'span' );
				span3.appendChild( label3 );
				span3.appendChild( valueInput3 );

				inputs.push( span3 );


		//}
		inputs.forEach( input => form.appendChild( input ) );
		
		form.appendChild( subscribeButton );
		form.appendChild( searchButton );

		//func.outputs
		const div = document.createElement( 'div' );
		div.className = 'results';

		const fs = document.createElement( 'fieldset' );
		fs.appendChild( legend );
		fs.appendChild( form );
		fs.appendChild( div );
		return fs;
	}

	renderRPC( funcAbi ){
		const legend = document.createElement( 'legend' );
		legend.innerText = funcAbi.name;

		const inputs = funcAbi.inputs.map(( input, index ) => {
			const label = document.createElement( 'label' );
			label.innerText = `${input.name}: `;

			const inputEl = document.createElement( 'input' );
			inputEl.name = input.name;
			inputEl.type = 'text';
			inputEl.innerText = input.name;
			inputEl.placeholder = `${input.name} (${input.type})`;
			inputEl.className = input.type;
			inputEl.attributes['data-index'] = index;

			const span = document.createElement( 'span' );
			span.appendChild( label );
			span.appendChild( inputEl );

			return span;
		})

		if( funcAbi.stateMutability === 'payable' ){
			const hr = document.createElement( 'hr' );
			inputs.push( hr );

			const label = document.createElement( 'label' );
			label.innerText = `value: `;

			const valueInput = document.createElement( 'input' );
			valueInput.className = 'value';
			valueInput.name = '$value';
			valueInput.placeholder = 'value (eth)';
			valueInput.type = 'text';

			const span = document.createElement( 'span' );
			span.appendChild( label );
			span.appendChild( valueInput );

			inputs.push( span );
		}

		const nameInput = document.createElement( 'input' );
		nameInput.name = 'name';
		nameInput.type = 'hidden';
		nameInput.value = funcAbi.name;
		inputs.unshift( nameInput );

		const submit = document.createElement( 'button' );
		if( [ 'pure', 'view' ].includes( funcAbi.stateMutability ) ){
			submit.innerText = 'Call';
			submit.addEventListener( 'click', evt => this.execute( evt, 'call' ));
		}
		else if( [ 'nonpayable', 'payable' ].includes( funcAbi.stateMutability ) ){
			submit.innerText = 'Send';
			submit.addEventListener( 'click', evt => this.execute( evt, 'send' ));
		}
		else{
			alert( 'wtf' );
		}


		const form = document.createElement( 'form' );
		form.attributes['data-abi'] = funcAbi;
		form.addEventListener( 'submit', EthereumDriver.preventDefault );
		inputs.forEach( input => form.appendChild( input ) );
		form.appendChild( submit );


		const gasCheck = document.createElement( 'button' );
		gasCheck.className = 'gas-check';
		gasCheck.innerText = 'Estimate Gas';
		gasCheck.addEventListener( 'click', evt => this.execute( evt, 'estimateGas' ));
		form.appendChild( gasCheck );


		//func.outputs
		const div = document.createElement( 'div' );
		div.className = 'results';

		const fs = document.createElement( 'fieldset' );
		fs.appendChild( legend );
		fs.appendChild( form );
		fs.appendChild( div );
		return fs
	}

	async saveContract( chainID, address, abiJson ){
		if( !window.localStorage )
			return;


		let name = '';
		try{
			name = await this.session.contract.methods.name().call();
		}
		catch( err ){
			this.session.warn( err );
		}


		let symbol = '';
		try{
			symbol = await this.session.contract.methods.symbol().call();
		}
		catch( err ){
			this.session.warn( err );
		}


		try{
			const json = localStorage.getItem( 'EthereumDriver.contracts' );
			let data = json ? JSON.parse( json ) : {};
			if( data.push ){
				const tmp = {};
				for( let d of data ){
					tmp[ d.address ] = d;
				}
				data = tmp;
			}

			if( address in data && !confirm( `Contract ${address} already exists.  Overwrite?` ) )
					return;


			const contract = {
				address: address,
				abiJson: abiJson,
				chainID: chainID
			};
			localStorage.setItem( address, JSON.stringify( contract ) );

			data[ address ] = {
				address,
				chainID: chainID,
				created: (new Date()).getTime(),
				name,
				symbol
			};
			localStorage.setItem( 'EthereumDriver.contracts', JSON.stringify( data ) );
			EthereumDriver.populateRecentContracts( this.recentFilters );
		}
		catch( err ){
			console.warn({ err });
		}
	}

	async searchLogs( evt ){
		EthereumDriver.preventDefault( evt );
		if( !(await this.session.connectWeb3( true )) )
			return;


		//TODO: searching...


		const options = [];
		const form = evt.target.form;
		const formAbi = form.attributes['data-abi'];
		const name = EthereumDriver.getFormName( form );
		let args = EthereumDriver.getFormArgs( form, options );
		args = args.map( arg => {
			if( arg )
				return Web3.utils.padLeft( Web3.utils.toHex( arg ), 64 );
			else
				return null;
			//Web3.utils.stripHexPrefix( arg );
			//return '0x' + arg.substring(2).padStart( 64, '0' );
		});

		const subArgs = {};
		subArgs.address = this.session.contractAddress;
		subArgs.fromBlock = 'earliest';
		subArgs.toBlock   = 'latest';

		let step;
		options.forEach( opt => {
			if( opt.value !== '' ){
				switch( opt.name ){
					case '$from':
						subArgs.fromBlock = parseInt( opt.value );
						break;

					case '$to':
						subArgs.toBlock = parseInt( opt.value );
						break;

					case '$step':
						step = parseInt( opt.value );
						break;

					default:
						console.warn( `Unsupported search option: ${opt.name}` );
				}
			}
		});




		//TODO: work on topics later
		const topicHash = this.session.web3client.eth.abi.encodeEventSignature( formAbi );
		subArgs.topics = [
			topicHash,
			...args
		];


		let blocks = 0;
		const results = [];
		if( step ){
			if( subArgs.fromBlock === 'earliest' || subArgs.toBlock === 'latest' ){
				alert( `Cannot iterate between blocks '${subArgs.fromBlock}' and '${subArgs.toBlock}'` );
				return;
			}

			const lastBlock = subArgs.toBlock;
			subArgs.toBlock = Math.min( subArgs.fromBlock + step - 1, lastBlock );
			while( subArgs.fromBlock <= subArgs.toBlock ){
				blocks += subArgs.toBlock - subArgs.fromBlock + 1;
				const logs = await this.session.contract.getPastEvents( name, subArgs );
				console.log( `Checking blocks: ${subArgs.fromBlock} - ${subArgs.toBlock}: ${logs.length}` );
				results.push( ...logs );

				subArgs.fromBlock += step;
				subArgs.toBlock = Math.min( subArgs.fromBlock + step - 1, lastBlock );
				
				//TODO:
				//status:  searched ${blocks} blocks, found ${results.length} events
			}
		}
		else{
			const logs = await this.session.contract.getPastEvents( name, subArgs );
			console.log( `Checking blocks: ${subArgs.fromBlock} - ${subArgs.toBlock}: ${logs.length}` );
			results.push( ...logs );
		}
		//common events can overflow the 10k limit, 
		//else if( ['Transfer', 'TransferSingle', 'TransferBatch'].includes( name ) ){


		//TODO: CSV
		const clean = results.map( log => {
			const log_ = {
				'blockNumber':     log.blockNumber,
				'transactionHash': log.transactionHash,
				'logIndex':        log.logIndex,
				'contract':        log.address
			};
			
			formAbi.inputs.forEach(( arg, i ) => {
				log_[ arg.name ] = log.returnValues[ arg.name ];
			});
			
			return log_;
		});

		const responseData = JSON.stringify( clean, null, '  ' );
		const responseDiv = form.parentElement.querySelector( 'div.results' );
		responseDiv.style.color = '#000';
		responseDiv.innerHTML = `<hr /><div class="output">${responseData}</div>`;
	}

	showConfig( isShow ){
		const configEl = document.getElementById( 'filter-container' ).querySelector( '.gear' );
		if( isShow === undefined ){
			isShow = configEl.classList.toggle( 'active' );
		}
		else{
			configEl.classList.remove( 'active' );
			if( isShow )
				configEl.classList.add( 'active' );
		}

		//document.body.addClass( 'show-config' );
		document.getElementById( 'config' ).style.display = isShow ? 'block' : 'none';
	}

	showTab( showTab, contentClass ){
		const recentContent = document.getElementById( 'recent-content' );
		const loadContent = document.getElementById( 'load-content' );
		const recentTab = document.getElementById( 'recent-tab' );
		const fileTab = document.getElementById( 'file-tab' );
		const jsonTab = document.getElementById( 'json-tab' );
		const templateTab = document.getElementById( 'template-tab' );

		const allTabs = [
			recentTab,
			fileTab,
			jsonTab,
			templateTab
		];

		for( let tab of allTabs ){
			tab.classList.remove( 'active' );
			if( tab.id === showTab )
				tab.classList.add( 'active' );
		}

		if( showTab === 'recent-tab' ){
			fileTab.innerText = 'Load...';
			jsonTab.style.display = 'none';
			templateTab.style.display = 'none';

			recentContent.style.display = 'block';
			loadContent.style.display = 'none'
		}
		else{
			fileTab.innerText = 'Load File';
			jsonTab.style.display = 'inline-block';
			templateTab.style.display = 'inline-block';

			recentContent.style.display = 'none';
			loadContent.style.display = 'block';
			loadContent.className = contentClass;
		}
	}

	async subscribe( evt, eventAbi ){
		EthereumDriver.preventDefault( evt );
		if( !(await this.session.connectWeb3( true )) )
			return;


		const form = evt.target.form;
		const name = EthereumDriver.getFormName( form );
		const args = EthereumDriver.getFormArgs( form );

		const subscription = this.session.contract.events[ name ]({});
		subscription.on( "connected", () => {
			console.info( "connected" );
		});
		subscription.on("data", ( log ) => {
			console.info({ log });
			alert(  log );
		});
		subscription.on( 'error', ( err ) => {
			console.error({ err });
			alert(  log );
		});
	}

	static TEMPLATES = {
		ERC20: [{"inputs":[{"internalType":"string","name":"name_","type":"string"},{"internalType":"string","name":"symbol_","type":"string"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"isDecreased","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"isIncreased","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"isApproved","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}],
		ERC721: [{"inputs":[{"internalType":"string","name":"name_","type":"string"},{"internalType":"string","name":"symbol_","type":"string"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"approved","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":false,"internalType":"bool","name":"approved","type":"bool"}],"name":"ApprovalForAll","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"tokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"approve","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getApproved","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"transferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"bytes","name":"_data","type":"bytes"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"}],
		ERC721Enumerable: [{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"approved","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":false,"internalType":"bool","name":"approved","type":"bool"}],"name":"ApprovalForAll","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"approve","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getApproved","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"bytes","name":"_data","type":"bytes"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"tokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"transferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"tokenOfOwnerByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"index","type":"uint256"}],"name":"tokenByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}],
		ERC1155: [{"inputs":[{"internalType":"string","name":"uri_","type":"string"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":false,"internalType":"bool","name":"approved","type":"bool"}],"name":"ApprovalForAll","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256[]","name":"ids","type":"uint256[]"},{"indexed":false,"internalType":"uint256[]","name":"values","type":"uint256[]"}],"name":"TransferBatch","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"TransferSingle","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"value","type":"string"},{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"}],"name":"URI","type":"event"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"uri","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"id","type":"uint256"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address[]","name":"accounts","type":"address[]"},{"internalType":"uint256[]","name":"ids","type":"uint256[]"}],"name":"balanceOfBatch","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256[]","name":"ids","type":"uint256[]"},{"internalType":"uint256[]","name":"amounts","type":"uint256[]"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"safeBatchTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"}]
	};
}
