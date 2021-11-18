import { ContractCard } from './ContractCard';

export const ContractDetails = (props: any) => {
  const { events, functions, contractAddress, chain, abi } = props;
  const data = [
    {
      name: 'eventLogs',
      Label: 'Event Logs',
      attribute: null,
      data: events,
      type: 'event',
      color: 'bg-green-200 dark:bg-green-600',
    },
    {
      name: 'readers',
      Label: 'Readers',
      attribute: 'view',
      type: 'function',
      color: 'bg-blue-200 dark:bg-blue-600',
      data: functions.filter((ele: any) => ele.stateMutability === 'view'),
    },
    {
      name: 'writers',
      Label: 'Writers',
      attribute: 'nonpayable',
      type: 'function',
      color: 'bg-yellow-200 dark:bg-yellow-600',
      data: functions.filter((ele: any) => ele.stateMutability === 'nonpayable'),
    },
    {
      name: 'minters',
      Label: 'Minters',
      attribute: 'payable',
      color: 'bg-red-200 dark:bg-red-600',
      type: 'function',
      data: functions.filter((ele: any) => ele.stateMutability === 'payable'),
    },
  ];

  return (
    <>
      <div>
        <p className="mb-4 mt-7 md:mt-0 text-2xl font-bold border-b dark:border-gray-700">
          Contract
        </p>
        <p>Network: {chain.name}</p>
        <div className="flex items-center">
          <p>Address: {contractAddress} </p>
          {chain.explorer ? (
            <a
              href={`${chain.explorer}/address/${contractAddress}`}
              target="_blank"
              rel="noreferrer"
              className="ml-2 text-xs text-red-600 underline"
            >
              View on Etherscan
            </a>
          ) : null}
        </div>
      </div>
      {/* Event logs */}
      <div className="pt-6 mt-6 text-right">
        <input
          type="text"
          // value={props.value}
          // onChange={onChange}
          className="h-8 pl-5 pr-8 border-0 rounded-md shadow dark:bg-gray-800 focus:border-gray-500 focus:bg-white focus:ring-0"
          placeholder="Search..."
        />
        <div className="flex justify-end mt-3">
          <label className="inline-flex items-center mr-3">
            <input type="checkbox" className="text-blue-300 rounded focus:ring-0" />
            <span className="ml-2 text-xs">View</span>
          </label>
          <label className="inline-flex items-center mr-3">
            <input type="checkbox" className="text-red-300 rounded focus:ring-0" checked />
            <span className="ml-2 text-xs">Payable</span>
          </label>
          <label className="inline-flex items-center">
            <input type="checkbox" className="text-yellow-300 rounded focus:ring-0" checked />
            <span className="ml-2 text-xs">Non-Payable</span>
          </label>
        </div>
      </div>
      {data.map((type) =>
        type.data.length ? (
          <div key={type.name} className="pt-6">
            <p className="mb-4 text-2xl font-bold border-b dark:border-gray-700">{type.Label}</p>
            <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {type.data.map((elem: any) => (
                <ContractCard
                  key={elem.name}
                  ele={elem}
                  type={type}
                  contract={{ abi, chain, contractAddress }}
                />
              ))}
            </div>
          </div>
        ) : null
      )}
    </>
  );
};
