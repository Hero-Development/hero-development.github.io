import { ContractCard } from './ContractCard';
import { useState } from 'react';
import Fuse from 'fuse.js';

export const ContractDetails = (props: any) => {
  const { events, functions, contractAddress, chain, abi } = props;
  const sortedData = [
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

  const [searchString, setsearchString] = useState('');
  const [filterArray, setfilterArray] = useState([]);

  const onChangeSearch = (e: any) => {
    console.log(searchString);
    setsearchString(e.target.value);
  };

  const searchData = (data: any) => {
    const options = {
      includeScore: true,
      keys: ['name'],
      threshold: 0.8,
    };
    const fuse = new Fuse(data, options);
    if (searchString) {
      return fuse.search(searchString);
    }
    return data.map((item: any) => ({ item, matches: [], score: 1 }));
  };

  const onChangeSelect = (e: any) => {
    const { name, checked } = e.target;
    console.log(filterArray);
    if (checked) {
      setfilterArray((prev) => [...prev, name]);
    } else {
      const index = filterArray.indexOf(name);
      setfilterArray((prev) => prev.splice(index, 1));
    }
  };

  const filterData = (data: any) => {
    if (filterArray.length) {
      return data.filter((ele: any) => filterArray.includes(ele.attribute));
    }
    return data;
  };

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
          value={searchString}
          onChange={onChangeSearch}
          className="h-8 pl-5 pr-8 border-0 rounded-md shadow dark:bg-gray-800 focus:border-gray-500 focus:bg-white focus:ring-0"
          placeholder="Search..."
        />
        <div className="flex justify-end mt-3">
          <label className="inline-flex items-center mr-3">
            <input
              onChange={onChangeSelect}
              type="checkbox"
              name="view"
              className="text-blue-300 rounded focus:ring-0"
            />
            <span className="ml-2 text-xs">View</span>
          </label>
          <label className="inline-flex items-center mr-3">
            <input
              onChange={onChangeSelect}
              type="checkbox"
              name="payable"
              className="text-red-300 rounded focus:ring-0"
            />
            <span className="ml-2 text-xs">Payable</span>
          </label>
          <label className="inline-flex items-center">
            <input
              onChange={onChangeSelect}
              type="checkbox"
              name="nonpayable"
              className="text-yellow-300 rounded focus:ring-0"
            />
            <span className="ml-2 text-xs">Non-Payable</span>
          </label>
        </div>
      </div>
      {filterData(sortedData).map((data) => (
        <div key={data.name} className="pt-6">
          <p className="mb-4 text-2xl font-bold border-b dark:border-gray-700">{data.Label}</p>
          <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {searchData(data.data).map((elem: any) => (
              <ContractCard
                key={elem.item.name}
                ele={elem.item}
                type={data}
                contract={{ abi, chain, contractAddress }}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
};
