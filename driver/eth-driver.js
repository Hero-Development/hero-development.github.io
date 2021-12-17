
class EthereumDriver{
  instance = null;
  session = null;
  filterConfig = {
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

  constructor( args ){
    EthereumDriver.instance = this;
    
    try{
      this.session = new EthereumSession( args );
    }
    catch( err ){
      throw new Error( 'EthereumSession not defined' );
    }
  }

  async execute( evt, type ){
    if( evt && evt.cancelable )
      evt.preventDefault()

    if( !(await this.session.connectWeb3( true )) )
      return


    const form = evt.target.form;
    const name = EthereumDriver.getFormName( form )
    const args = EthereumDriver.getFormArgs( form )

    const options1559 = {
      'from': this.session.wallet.accounts[0]
    };
    const abi = form.attributes['data-abi']
    if( abi.stateMutability === 'payable' ){
      const value = form.querySelector( 'input.value' ).value
      if( value ){
        options1559.value = Web3.utils.toWei( value, 'ether' )
      }
    }
    const optionsType1 = Object.assign({}, options1559);
    optionsType1.type = '0x1';

    const session = this.session;
    const requestDate = new Date();
    const method = this.session.contract.methods[ name ]( ...args );
    
    try{
      let args;
      try{
        args = await method[ type ]( options1559 );
      }
      catch( err ){
        if( err.code && err.code === -32602 ){
          delete options.type;
          args = await method[ type ]( optionsType1 );
        }
        else
          throw err
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
          if( abi.outputs.length === 1 ){
            args = [ args ];
          }
          else{
            args.length = abi.outputs.length;
            args = Array.prototype.slice.call( args );
          }

          const isAllKeys = abi.outputs.every( o => !!o.name );
          response = (abi.outputs.length && isAllKeys) ? {} : [];
        
          //TODO: EthereumDriver.formatResponse( arguments )
          args.map(( arg, i ) => {
            const op = abi.outputs[i];
            switch( op.type ){
              case 'address':
              case 'bool':
              case 'string':
                //no-op
                break;

              case 'int256':
              case 'uint':
              case 'uint256':
                if( arg.length <= 16 ){
                  const tmp = parseInt( arg );
                  if( !`${tmp}`.includes( '.' ) )
                    arg = tmp;
                }
                break;

              default:
                console.warn( op.type )
            }

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
          response = args
        }

        const responseDiv = form.parentElement.querySelector( 'div.results' )
        responseDiv.style.color = '#000';
        responseDiv.innerHTML = `${responseDate.getTime()}<br />${responseDate.toISOString()}<hr />${JSON.stringify( response )}`
    }
    catch( err ){
      const responseDate = new Date();
      const error = EthereumSession.getError( err );

      const responseDiv = form.parentElement.querySelector( 'div.results' )
      responseDiv.style.color = '#f66';
      responseDiv.innerHTML = `${responseDate.getTime()}<br />${responseDate.toISOString()}<hr />${JSON.stringify( error )}`
    }
  }

  static filter( filterConfig ){
    console.info( filterConfig );

    const forms = Array.prototype.slice.call( document.getElementsByTagName( 'form' ) );
    forms.forEach( f => {
      const abi = f.attributes['data-abi'];
      if( abi.type === 'event' ){
        if( filterConfig.regex.test( abi.name ) && filterConfig.types.includes( 'event' ) ){
          f.parentElement.style.display = 'block';
        }
        else{
          f.parentElement.style.display = 'none';
        }
      }
      else if( abi.type === 'function' ){
        if( filterConfig.regex.test( abi.name ) && filterConfig.stateMutability.includes( abi.stateMutability ) ){
          f.parentElement.style.display = 'block';
        }
        else{
          f.parentElement.style.display = 'none';
        }
      }
    })
  }

  static formSubmit( evt ){
    if( evt && evt.cancelable )
      evt.preventDefault()
  }

  static getFormArgs( form ){
    const data = []
    for( let i = 0; i < form.length; ++i ){
      const input = form[i]
      if( input.type === 'hidden' )
        continue;

      if( input.name === '$value' )
        continue;


      if( input.type === 'text' ){
        let name = input.name;
        if( !name )
          name = `${data.length}`

        let value = null;
        try{
          value = JSON.parse( input.value );
        }
        catch( err ){
          value = input.value;
        }

        if( [ 'boolean', 'object', 'string' ].includes( typeof value ) ){
          //ok
        }
        else{
          //revert to string format in case of long numbers
          value = input.value;
        }

        data.push({
          'index': parseInt( input.attributes['data-index'] ),
          'name':  name,
          'value': value
        })
      }
    }

    data.sort(( left, right ) => {
      if( left.index < right.index )
        return -1
      else if( left.index < right.index )
        return 1
      else
        return 0
    })

    return data.map( d => d.value )
  }

  static getFormName( form ){
    for( let i = 0; i < form.length; ++i ){
      const input = form[i]
      if( input.name === 'name' )
        return input.value
    }

    return null
  }

  async load( chainID, address, abiJson, save ){
    let chain;
    if( chainID in EthereumSession.COMMON_CHAINS ){
      chain = EthereumSession.COMMON_CHAINS[ chainID ]
    }
    else{
      alert( `Unsupported network: ${chainID}` )
      return
    }

    //TODO: check address

    let abi;
    try{
      abi = JSON.parse( abiJson )
    }
    catch( err ){
      alert( `Invalid ABI JSON` )
      return
    }

    this.session = new EthereumSession({
      chain:           chain,
      contractAddress: address,
      contractABI:     abi
    })

    await this.session.connectWeb3( true );
    if( save ){
      this.saveContract( chainID, address, JSON.stringify( abi ) );
    }

    this.renderAll()

    const configEl = document.getElementById( 'config' )
    if( configEl ){
      configEl.style.display = 'none';
    }

    const contractEl = document.getElementById( 'contract' )
    if( contractEl ){
      contractEl.style.display = 'block';
    }
  }

  loadAddress( address ){
    let contract = localStorage.getItem( address )
    if( contract ){
      contract = JSON.parse( contract )
      this.load( contract.chainID, contract.address, contract.abiJson, false )
    }
  }

  async loadFile(){
    const chainID = document.getElementById( 'contract-network' ).value
    const contractAddress = document.getElementById( 'contract-address' ).value
    const abiFile = document.getElementById( 'contract-abi-file' )
    const abiJson = await abiFile.files[0].text();

    this.load( chainID, contractAddress, abiJson, true )
  }

  loadJson(){
    const chainID = document.getElementById( 'contract-network' ).value
    const contractAddress = document.getElementById( 'contract-address' ).value
    const abiJson = document.getElementById( 'contract-abi-json' ).value

    this.load( chainID, contractAddress, abiJson, true )
  }

  //TODO: run-once
  static populateRecentContracts(){
    let json = localStorage.getItem( 'EthereumDriver.contracts' )
    if( json ){
      const contracts = Object.values( JSON.parse( json ) )
      contracts.sort(( left, right ) => {
        if( left.created < right.created )
          return 1

        if( left.created > right.created )
          return -1

        //TODO: accessed

        return 0
      })

      let html = '<table border="1" cellpadding="2" cellspacing="0" style="border: 1px solid black; border-collapse: collapse;">';
      html += '<tr><th></th><th>Created</th><th>Network</th><th>Address</th><th>Name</th><th>Symbol</th></tr>';
      for( let contract of contracts ){
        let chain = '(unknown)';
        if( contract.chainID ){
          chain = EthereumSession.COMMON_CHAINS[ contract.chainID ].name;
        }

        html += `<tr id="${contract.address}">`
            +`<td><a href="#" class="load-contract">Load</td>`
            +`<td>${(new Date( contract.created )).toISOString().replace( 'T', ' ' ).replace( 'Z', '' )}</td>`
            +`<td>${chain}</td>`
            +`<td>${contract.address}</td>`
            +`<td>${contract.name}</td>`
            +`<td>${contract.symbol}</td>`
          +`</tr>`;
      }
      html += '</table>';

      const select = document.getElementById( 'recent-content' );
      select.innerHTML = html;
    }
  }

  //TODO: run-once
  registerEvents(){
    
    //TODO: showHideConfig();
    const configEl = document.getElementById( 'filter-container' ).querySelector( '.gear' )
    if( configEl ){
      configEl.addEventListener( 'click', evt => {
        if( configEl.classList.toggle( 'active' ) ){
          document.getElementById( 'config' ).style.display = 'block'
        }
        else{
          document.getElementById( 'config' ).style.display = 'none'
        }
      })
    }


    const recentContent = document.getElementById( 'recent-content' );
    const loadContent = document.getElementById( 'load-content' );


    //TODO: showTabRecent()
    const recentTab = document.getElementById( 'recent-tab' );
    
    //TODO: showTabLoadFile
    const fileTab = document.getElementById( 'file-tab' );
    
    //TODO: showTabLoadJson
    const jsonTab = document.getElementById( 'json-tab' );

    //showTabLoadTemplate
    const templateTab = document.getElementById( 'template-tab' );
    
    if( recentTab ){
      recentTab.addEventListener( 'click', () => {
        recentTab.classList.remove( 'active' );
        fileTab.classList.remove( 'active' );
        jsonTab.classList.remove( 'active' );
        templateTab.classList.remove( 'active' );
        recentTab.classList.add( 'active' );

        let el;
        for( let id of [ 'file-tab', 'json-tab', 'template-tab' ] ){
          el = document.getElementById( id )
          if( el ){
            el.style.display = 'none';
          }
        }

        el = document.getElementById( 'file-tab' )
        if( el ){
          el.style.display = 'inline-block';
          el.innerText = 'Load...';
        }

        recentContent.style.display = 'block';
        loadContent.style.display = 'none';
      })
    }



    if( fileTab ){
      fileTab.addEventListener( 'click', () => {
        recentTab.classList.remove( 'active' );
        fileTab.classList.remove( 'active' );
        jsonTab.classList.remove( 'active' );
        templateTab.classList.remove( 'active' );
        fileTab.classList.add( 'active' );


        if( !fileTab.classList.contains( 'active' ) ){
          fileTab.classList.add( 'active' );
        }
        
        let el;
        for( let id of [ 'file-tab', 'json-tab', 'template-tab' ] ){
          el = document.getElementById( id )
          if( el ){
            el.style.display = 'inline-block';
          }
        }

        fileTab.innerText = 'Load File';

        recentContent.style.display = 'none';
        loadContent.className = 'file';
        loadContent.style.display = 'block';
      })
    }


    if( jsonTab ){
      jsonTab.addEventListener( 'click', () => {
        recentTab.classList.remove( 'active' );
        fileTab.classList.remove( 'active' );
        jsonTab.classList.remove( 'active' );
        templateTab.classList.remove( 'active' );
        jsonTab.classList.add( 'active' );

        loadContent.className = 'json';
      })
    }


    if( templateTab ){
      templateTab.addEventListener( 'click', () => {
        recentTab.classList.remove( 'active' );
        fileTab.classList.remove( 'active' );
        jsonTab.classList.remove( 'active' );
        templateTab.classList.remove( 'active' );
        templateTab.classList.add( 'active' );

        loadContent.className = 'template';
      })
    }

    const contractBtn = document.getElementById( 'btn-load-contract' )
    if( contractBtn ){
      contractBtn.addEventListener('click', evt => {
        if( evt.cancelable )
          evt.preventDefault()

        const abiFile = document.getElementById( 'contract-abi-file' ).value;
        const abiJson = document.getElementById( 'contract-abi-json' ).value;
        if( abiFile ){
          this.loadFile();
        }
        else if( abiJson ){
          this.loadJson();
        }
        else{
          alert( 'No ABI' );
        }
      })
    }


    const recentBtn = document.getElementById( 'btn-load-recent' )
    if( recentBtn ){
      recentBtn.addEventListener('click', evt => {
        if( evt.cancelable )
          evt.preventDefault()

        const address = document.getElementById( 'recent-contract' ).value;
        if( address ){
          this.loadAddress( address );
          /*
          let contract = localStorage.getItem( address )
          if( contract ){
            contract = JSON.parse( contract )
            this.load( contract.chainID, contract.address, contract.abiJson, false )
          }
          */
        }
      })
    }


    const filterEl = document.getElementById( 'filter' );
    if( filterEl ){
      filterEl.addEventListener( 'keydown', evt => {
        if( evt.key === "Escape" ){
          evt.target.value = '';
          this.filterConfig.regex = /.*/;
        }
        else if( evt.key === "Enter" ){
          let pattern = '.*', flags = 'i';
          if( evt.target.value ){
            pattern = evt.target.value
            const groups = /^\/([^\/]+)\/([dgimsuy]*)$/.exec( evt.target.value )
            if( groups && groups.length === 3 ){
              pattern = groups[1]
              flags = groups[2]
            }
          }
          this.filterConfig.regex = new RegExp( pattern, flags );
        }

        EthereumDriver.filter( this.filterConfig );
      });
    }

    const greenButton = document.querySelector( '#filter-container .green' );
    if( greenButton ){
      greenButton.addEventListener( 'click', evt => {
        if( greenButton.classList.toggle( 'active' ) ){
          if( !this.filterConfig.types.includes( 'event' ) )
            this.filterConfig.types.push( 'event' )
        }
        else{
          let at = this.filterConfig.types.indexOf( 'event' )
          if( at > -1 )
            this.filterConfig.types.splice( at, 1 )
        }

        EthereumDriver.filter( this.filterConfig );
      })
    }


    const blueButton = document.querySelector( '#filter-container .blue' );
    if( blueButton ){
      blueButton.addEventListener( 'click', evt => {
        if( blueButton.classList.toggle( 'active' ) ){
          if( !this.filterConfig.stateMutability.includes( 'pure' ) )
            this.filterConfig.stateMutability.push( 'pure' )

          if( !this.filterConfig.stateMutability.includes( 'view' ) )
            this.filterConfig.stateMutability.push( 'view' )
        }
        else{
          let at = this.filterConfig.stateMutability.indexOf( 'pure' )
          if( at > -1 )
            this.filterConfig.stateMutability.splice( at, 1 )

          at = this.filterConfig.stateMutability.indexOf( 'view' )
          if( at > -1 )
            this.filterConfig.stateMutability.splice( at, 1 )
        }

        EthereumDriver.filter( this.filterConfig );
      })
    }

    const yellowButton = document.querySelector( '#filter-container .yellow' );
    if( yellowButton ){
      yellowButton.addEventListener( 'click', evt => {
        if( yellowButton.classList.toggle( 'active' ) ){
          if( !this.filterConfig.stateMutability.includes( 'nonpayable' ) )
            this.filterConfig.stateMutability.push( 'nonpayable' )
        }
        else{
          const at = this.filterConfig.stateMutability.indexOf( 'nonpayable' )
          if( at > -1 )
            this.filterConfig.stateMutability.splice( at, 1 )
        }

        EthereumDriver.filter( this.filterConfig );
      })
    }

    const redButton = document.querySelector( '#filter-container .red' );
    if( redButton ){
      redButton.addEventListener( 'click', evt => {
        if( redButton.classList.toggle( 'active' ) ){
          if( !this.filterConfig.stateMutability.includes( 'payable' ) )
            this.filterConfig.stateMutability.push( 'payable' )
        }
        else{
          const at = this.filterConfig.stateMutability.indexOf( 'payable' )
          if( at > -1 )
            this.filterConfig.stateMutability.splice( at, 1 )
        }

        EthereumDriver.filter( this.filterConfig );
      });
    }


    document.addEventListener( 'click', evt => {
      if( evt.target.nodeName === 'A' && evt.target.classList.contains( 'load-contract' ) ){
        const address = evt.target.parentElement.parentElement.id;
        this.loadAddress( address );
      }
    });
    
    const changeWallet = document.getElementById( 'change-wallet' )
    if( changeWallet ){
      changeWallet.addEventListener( 'click', async (evt) => {
        if( evt && evt.cancelable )
          evt.preventDefault();

        this.session.wallet.accounts = await this.session.requestWalletAccounts();
      });
    }

    if( window.ethereum ){
      window.ethereum.on('accountsChanged', async (accounts) => {
        this.session.wallet.accounts = accounts;
      });
    }
  }

  async renderAll(){
    //HEADER

    //TODO: owner()
//TODO: if correct chain
    try{
      const name = await this.session.contract.methods.name().call()
      document.getElementById( 'contract-header' ).querySelector( '.name' ).innerText = name
    }
    catch( err ){
      this.session.warn( err )
    }


    try{
      const symbol = await this.session.contract.methods.symbol().call()
      document.getElementById( 'contract-header' ).querySelector( '.symbol' ).innerText = `(${symbol})`
    }
    catch( err ){
      this.session.warn( err )
    }


    try{
      let address = this.session.contractAddress
      if( this.session.chain.explorer ){
        address += `&#8203; <small>(<a href="${this.session.chain.explorer}/address/${this.session.contractAddress}" target="_blank">Etherscan</a>)</small>`
      }

      document.getElementById( 'contract-detail' ).querySelector( '.address' ).innerHTML = address
    }
    catch( err ){
      debugger;
    }


    //EVENTS
    const outputEl = document.getElementById( 'events-content' )
    outputEl.innerHTML = '';

    const events = this.session.contractABI.filter( item => item.type === 'event' );
    events.sort(( l, r ) => {
      if( l.name < r.name )
        return -1;
      if( l.name > r.name )
        return 1;

      return 0;
    })
    events.forEach( evt => {
      const el = this.renderEvent( evt )
      if( el ){
        outputEl.appendChild( el )
      }
    })


    //FUNCTIONS
    const functions = this.session.contractABI.filter( item => item.type === 'function' );
    functions.sort(( l, r ) => {
      if( l.name < r.name )
        return -1;
      if( l.name > r.name )
        return 1;

      return 0;
    })

    const readersEl = document.getElementById( 'readers-content' );
    readersEl.innerText = ''

    const writersEl = document.getElementById( 'writers-content' );
    writersEl.innerText = ''

    const mintersEl = document.getElementById( 'minters-content' );
    mintersEl.innerText = ''

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
    })
  }

  renderEvent( eventAbi ){
    const legend = document.createElement( 'legend' )
    legend.innerText = eventAbi.name

    const inputs = [];
    /*
    const inputs = eventAbi.inputs.map(( input, index ) => {
      const label = document.createElement( 'label' )
      label.innerText = `${input.name}: `

      const inputEl = document.createElement( 'input' )
      inputEl.name = input.name
      inputEl.type = 'text'
      inputEl.innerText = input.name
      inputEl.placeholder = `${input.name} (${input.type})`
      inputEl.className = input.type
      inputEl.attributes['data-index'] = index

      const span = document.createElement( 'span' )
      span.appendChild( label )
      span.appendChild( inputEl )

      return span
    })
    */

    const nameInput = document.createElement( 'input' )
    nameInput.name = 'name'
    nameInput.type = 'hidden'
    nameInput.value = eventAbi.name
    inputs.unshift( nameInput )

    //TODO: Search

    const submit = document.createElement( 'button' )
    submit.innerText = 'Subscribe'
    submit.addEventListener( 'click', evt => this.subscribe( evt, eventAbi ))

    const form = document.createElement( 'form' )
    form.attributes['data-abi'] = eventAbi
    form.addEventListener( 'submit', EthereumDriver.formSubmit )
    inputs.forEach( input => form.appendChild( input ) )
    form.appendChild( submit )

    //func.outputs
    const div = document.createElement( 'div' )
    div.className = 'results'

    const fs = document.createElement( 'fieldset' )
    fs.appendChild( legend )
    fs.appendChild( form )
    fs.appendChild( div )
    return fs
  }

  renderRPC( funcAbi ){
    const legend = document.createElement( 'legend' )
    legend.innerText = funcAbi.name

    const inputs = funcAbi.inputs.map(( input, index ) => {
      const label = document.createElement( 'label' )
      label.innerText = `${input.name}: `

      const inputEl = document.createElement( 'input' )
      inputEl.name = input.name
      inputEl.type = 'text'
      inputEl.innerText = input.name
      inputEl.placeholder = `${input.name} (${input.type})`
      inputEl.className = input.type
      inputEl.attributes['data-index'] = index

      const span = document.createElement( 'span' )
      span.appendChild( label )
      span.appendChild( inputEl )

      return span
    })

    if( funcAbi.stateMutability === 'payable' ){
      const hr = document.createElement( 'hr' );
      inputs.push( hr )

      const label = document.createElement( 'label' )
      label.innerText = `value: `

      const valueInput = document.createElement( 'input' )
      valueInput.className = 'value'
      valueInput.name = '$value'
      valueInput.placeholder = 'value (eth)'
      valueInput.type = 'text'

      const span = document.createElement( 'span' )
      span.appendChild( label )
      span.appendChild( valueInput )

      inputs.push( span )
    }

    const nameInput = document.createElement( 'input' )
    nameInput.name = 'name'
    nameInput.type = 'hidden'
    nameInput.value = funcAbi.name
    inputs.unshift( nameInput )

    const submit = document.createElement( 'button' )
    if( [ 'pure', 'view' ].includes( funcAbi.stateMutability ) ){
      submit.innerText = 'Call'
      submit.addEventListener( 'click', evt => this.execute( evt, 'call' ))
    }
    else if( [ 'nonpayable', 'payable' ].includes( funcAbi.stateMutability ) ){
      submit.innerText = 'Send'
      submit.addEventListener( 'click', evt => this.execute( evt, 'send' ))
    }
    else{
      alert( 'wtf' );
    }


    const form = document.createElement( 'form' )
    form.attributes['data-abi'] = funcAbi
    form.addEventListener( 'submit', EthereumDriver.formSubmit )
    inputs.forEach( input => form.appendChild( input ) )
    form.appendChild( submit )


    const gasCheck = document.createElement( 'button' )
    gasCheck.className = 'gas-check'
    gasCheck.innerText = 'Estimate Gas'
    gasCheck.addEventListener( 'click', evt => this.execute( evt, 'estimateGas' ))
    form.appendChild( gasCheck )


    //func.outputs
    const div = document.createElement( 'div' )
    div.className = 'results'

    const fs = document.createElement( 'fieldset' )
    fs.appendChild( legend )
    fs.appendChild( form )
    fs.appendChild( div )
    return fs
  }

  async saveContract( chainID, address, abiJson ){
    if( !window.localStorage )
      return;


    let name = '';
    try{
      name = await this.session.contract.methods.name().call()
    }
    catch( err ){
      this.session.warn( err )
    }

    let symbol = '';
    try{
      symbol = await this.session.contract.methods.symbol().call()
    }
    catch( err ){
      this.session.warn( err )
    }


    try{
      let data = {}
      const json = localStorage.getItem( 'EthereumDriver.contracts' )
      if( json ){
        data = JSON.parse( json )
      }

      if( address in data && !confirm( `Contract ${address} already exists.  Overwrite?` ) )
          return;


      const contract = {
        address: address,
        abiJson: abiJson,
        chainID: chainID
      }
      localStorage.setItem( address, JSON.stringify( contract ) )


      data[ address ] = {
        address,
        chainID: chainID,
        created: (new Date()).getTime(),
        name,
        symbol
      }
      localStorage.setItem( 'EthereumDriver.contracts', JSON.stringify( data ) )
      EthereumDriver.populateRecentContracts()
    }
    catch( err ){
      debugger;
    }
  }

  async subscribe( evt, eventAbi ){
    if( evt && evt.cancelable )
      evt.preventDefault()

    if( !(await this.session.connectWeb3( true )) )
      return


    const form = evt.target.form;
    const name = EthereumDriver.getFormName( form )
    const args = EthereumDriver.getFormArgs( form )

    this.session.contract.events[ name ]({})
      .on( 'data', async function(){
        debugger;
      })

      /*
    this.session.web3client.eth.subscribe('logs', args)

      args = args ? args : {}
      args = {
          ...args,
          'address': this.session.contractAddress,
      }

      const subscription = this.


      const eventHashes = {}
      const eventTopics = []
      await this.mapEvents( eventHashes, eventTopics )

      const subArgs = {}
      if( eventTopics.length )
          subArgs.topics = eventTopics


      let fromBlock = this.getBlockNumber()
      const contractAddress = this.config.input.contract.address
      if( fromBlock <= 0 )
          fromBlock = await this.infura.getLastBlock( contractAddress )

      if( fromBlock > 0 )
          subArgs.fromBlock = fromBlock

      const subscription = this.infura.subscribeToLogs(contractAddress, subArgs)
      subscription.on("data", async log => {


      return subscription
  */

  }
}
