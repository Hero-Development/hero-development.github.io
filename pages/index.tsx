import type { NextPage } from "next";
import Image from "next/image";

import { Header } from "../components/common/Header";
import toast from "react-hot-toast";
import React from "react";
import { useWeb3React } from "@web3-react/core";
import { TabGroup } from "../components/common/TabGroup";
import {
  LoadContractForm,
  ContractDetails,
  LoadRecentContractForm,
  LogTab,
} from "../components/contract";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { AppearTransition } from "../components/common/AppearTransition";
// import { COMMON_CHAINS } from "../lib/constants";

const Home: NextPage = () => {
  const [events, setEvents] = React.useState([]);
  const [functions, setFunctions] = React.useState([]);
  const [contractAddress, setcontractAddress] = React.useState("");
  const [chain, setChain] = React.useState("");
  const [abi, setABI] = React.useState("");
  // const { account, library, activate } = useWeb3React();
  const [persistContract, setPersistContract] = useLocalStorage(
    [],
    "eth-util-contract"
  );

  const onSubmitContForm = ({ abi, address, chain }: any) => {
    setcontractAddress(address);
    setChain(chain);
    setABI(abi);
    const eventsFiltered = abi
      .filter((item: any) => item.type === "event")
      .sort((l: any, r: any) => {
        if (l.name < r.name) return -1;
        if (l.name > r.name) return 1;
        return 0;
      });
    setEvents(eventsFiltered);
    const functionsFiltered = abi
      .filter((item: any) => item.type === "function")
      .sort((l: any, r: any) => {
        if (l.name < r.name) return -1;
        if (l.name > r.name) return 1;
        return 0;
      });
    console.log("ABI", abi);
    console.log("ABI Filter", functionsFiltered);
    setFunctions(functionsFiltered);
    const contExists = persistContract.find(
      (ele: any) => address === ele.address
    );
    !contExists &&
      setPersistContract([{ abi, address, chain }, ...persistContract]);
    toast.success("Contract loaded successfully!");
  };

  const categories = {
    Recent: <LoadRecentContractForm onSubmit={onSubmitContForm} />,
    New: <LoadContractForm onSubmit={onSubmitContForm} />,
    Template: <div />,
    Logs: <LogTab />,
  };

  return (
    <>
      <Header />
      <div className="flex flex-wrap overflow-hidden scrollbar scrollbar-thumb-gray-900 scrollbar-thumb-rounded scrollbar-track-gray-100">
        <div className="w-full pt-3 border-r dark:border-gray-700 md:w-1/4">
          <h3 className="mb-3 text-2xl font-bold text-center ">
            Load Contract
          </h3>
          <TabGroup categories={categories} />
        </div>
        <div className="w-full p-6 md:h-screen md:overflow-y-auto md:w-3/4 scrollbar-hide">
          {events.length ? (
            <AppearTransition>
              <ContractDetails
                events={events}
                functions={functions}
                chain={chain}
                contractAddress={contractAddress}
                abi={abi}
              />
            </AppearTransition>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-2xl font-bold">
                Please load a contract from the side pane.
              </p>
              <Image
                width={300}
                height={300}
                src="/selection.svg"
                alt="selection"
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Home;
