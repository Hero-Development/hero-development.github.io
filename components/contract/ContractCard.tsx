import { useState } from "react";

import Web3 from "web3";
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
import Fortmatic from "fortmatic";
import Authereum from "authereum";

import toast from "react-hot-toast";
import { useForm } from "react-hook-form";

import { useTheme } from "next-themes";

import { useLogsStore } from "../../store/logs";
import { useEventLogsStore } from "../../store/eventLog";

export const ContractCard = (props: any) => {
  const { type, ele, contract } = props;
  const { theme } = useTheme();
  const [contractResponse, setContractResponse] = useState(null);
  const { register, handleSubmit, formState, control } = useForm({});

  const providerOptions = {
    walletconnect: {
      package: WalletConnectProvider,
      options: {
        infuraId: "7b69ffbc6d3a42da8ba47def5002fbe8",
      },
    },
    fortmatic: {
      package: Fortmatic,
      options: {
        key: "pk_test_E08BCE8A1D50F86C",
      },
    },
    authereum: {
      package: Authereum,
    },
  };

  const onClickTransaction = async (
    values: any,
    method: string,
    type: string,
    funcType: string
  ) => {
    const web3Modal = new Web3Modal({
      providerOptions, // required
      theme: theme === "dark" ? "dark" : "light",
      network: "mainnet",
      cacheProvider: true,
    });

    const provider = await web3Modal.connect();

    const web3 = new Web3(provider);
    const accounts = await web3.eth.getAccounts();
    const address = accounts[0];
    const networkId = await web3.eth.net.getId();
    const cont = new web3.eth.Contract(contract.abi, contract.contractAddress);

    try {
      let response;
      const option = {
        from: address,
      };
      if (type === "event") {
        cont.events[method]({}, (err: any, eve: any) => {
          useEventLogsStore.getState().addEventLog({
            type,
            method,
            data: eve,
          });
        });
      }
      if (type === "function") {
        console.log("Method values", ...Object.values(values));
        response = await cont.methods[method](...Object.values(values))[
          funcType
        ](option);
      }
      if (type === "estimateGas") {
        console.log("GAS ESTIMATE EXECUTED");
        response = await cont.methods[method](
          ...Object.values(values)
        ).estimateGas(option);
      }
      console.log("CONTRACT RESPONSE", response);
      useLogsStore.getState().addLog({
        type,
        method,
        data: response,
      });
      setContractResponse(response);
    } catch (error: any) {
      toast.error(error.message);
      console.error("Failed To Get Contract", error);
    }
  };

  return (
    <div className="flex flex-col justify-between transition duration-500 transform shadow dark:bg-gray-800 hover:shadow-md focus:shadow focus:outline-none rounded-xl">
      <p
        className={`px-3 text-sm  border-b dark:border-gray-700 rounded-t-md ${type.color}`}
      >
        {ele.name}
      </p>
      <form className="grid grid-cols-1 gap-6">
        <div>
          {type.type !== "event" &&
            ele.inputs.map((input: any) => (
              <div className="px-3 pb-2 " key={input.name}>
                <label className="block">
                  <p className="text-xs text-gray-500 mt-3">{input.name}</p>
                  <input
                    type="text"
                    className="block w-full h-6 text-xs bg-gray-100 border-transparent rounded-md dark:bg-gray-700 focus:border-gray-500 focus:bg-white focus:ring-0"
                    placeholder={`${input.name} (${input.type})`}
                    {...register(input.name ? input.name : input.type, {
                      required: "Required",
                    })}
                  />
                  <div
                    role="alert"
                    aria-label={formState.errors[input.name]?.message}
                    className={`text-xs font-semibold text-red-500 duration-300 ease-out transition-height ${
                      formState.errors[input.name]?.message ? "h-5" : "h-0"
                    }`}
                  >
                    {formState.errors[input.name]?.message}
                  </div>
                </label>
              </div>
            ))}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center justify-between p-3">
            {type.type !== "event" ? (
              <>
                <button
                  onClick={handleSubmit((values) =>
                    onClickTransaction(values, ele.name, "function", "call")
                  )}
                  className="px-1 py-1 text-xs tracking-wide text-red-500 transition duration-500 transform border border-red-500 rounded-md w-max disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 focus:outline-none focus:shadow-outline"
                >
                  {["pure", "view"].includes(ele.stateMutability)
                    ? "Call"
                    : "Send"}
                </button>
                <button
                  onClick={handleSubmit((values) =>
                    onClickTransaction(values, ele.name, "estimateGas", "send")
                  )}
                  className="px-1 py-1 text-xs tracking-wide text-red-500 transition duration-500 transform border border-red-500 rounded-md w-max disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 focus:outline-none focus:shadow-outline"
                >
                  Estimate Gas
                </button>
              </>
            ) : (
              <button
                onClick={handleSubmit((values) =>
                  onClickTransaction(values, ele.name, "event", "event")
                )}
                className="px-1 py-1 text-xs tracking-wide text-red-500 transition duration-500 transform border border-red-500 rounded-md w-max disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 focus:outline-none focus:shadow-outline"
              >
                Subscribe
              </button>
            )}
          </div>
          {contractResponse ? (
            <div className="w-full p-2 text-white bg-gray-700 dark:bg-gray-900 rounded-md">
              <p className="text-xs ">Response: </p>
              <p className="text-xs break-all ">
                {JSON.stringify(contractResponse)}
              </p>
            </div>
          ) : null}
        </div>
      </form>
    </div>
  );
};
