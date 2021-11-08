import { useEffect, useState } from "react";

import { InjectedConnector } from "@web3-react/injected-connector";
import { WalletConnectConnector } from "@web3-react/walletconnect-connector";
import { useWeb3React } from "@web3-react/core";
import { UserRejectedRequestError } from "@web3-react/injected-connector";
import { Contract } from "@ethersproject/contracts";
import { formatEther } from "@ethersproject/units";

import { useForm } from "react-hook-form";

import { useLogsStore } from "../../store/logs";

export const ContractCard = (props: any) => {
  const { type, ele, contract } = props;
  const { active, error, activate, chainId, account, setError, library } =
    useWeb3React();

  const [contractResponse, setContractResponse] = useState(null);

  const { register, handleSubmit, formState, control } = useForm({});

  const [connecting, setConnecting] = useState(false);
  useEffect(() => {
    if (active || error) {
      setConnecting(false);
    }
  }, [active, error]);

  const injected = new InjectedConnector({
    supportedChainIds: [1, 3, 4, 5, 42],
  });

  const connectWallet = () => {
    setConnecting(true);
    activate(injected, undefined, true).catch((error) => {
      if (error instanceof UserRejectedRequestError) {
        setConnecting(false);
      } else {
        setError(error);
      }
    });
  };

  const onClickTransaction = async (
    values: any,
    method: string,
    type: string
  ) => {
    console.log(values, method, type);
    connectWallet();
    try {
      const cont = new Contract(
        contract.contractAddress,
        contract.abi,
        library.getSigner(account)
      );
      console.log("CONTRACT", cont);

      console.log("HI");
      let response;
      if (type === "event") {
        // cont.on(method, (from, to, amount) => {
        //   console.log(from);
        // });
      }
      if (type === "function") {
        console.log("FUNCTION EXECUTED");
        response = await cont[method](values);
      }
      if (type === "estimateGas") {
        console.log("GAS ESTIMATE EXECUTED");
        response = await cont.estimateGas[method](values);
      }
      console.log("CONTRACT RESPONSE", response);
      setContractResponse(response);
      useLogsStore.getState().addLog({
        type,
        method,
        data: response,
      });
    } catch (error) {
      console.error("Failed To Get Contract", error);
    }
  };

  console.log("FORMSTATE ERROR", formState.errors);

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
              <div className="px-3 pb-2" key={input.name}>
                <label className="block">
                  <span className="text-xs text-gray-500">{input.name}</span>
                  <input
                    type="text"
                    className="block w-full h-6 text-xs bg-gray-100 border-transparent rounded-md dark:bg-gray-700 focus:border-gray-500 focus:bg-white focus:ring-0"
                    placeholder={`${input.name} (${input.type})`}
                    {...register(input.name, { required: "Required" })}
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
                    onClickTransaction(values, ele.name, "function")
                  )}
                  className="px-1 py-1 text-xs tracking-wide text-red-500 transition duration-500 transform border border-red-500 rounded-md w-max disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 focus:outline-none focus:shadow-outline"
                >
                  Call
                </button>
                <button
                  onClick={handleSubmit((values) =>
                    onClickTransaction(values, ele.name, "estimateGas")
                  )}
                  className="px-1 py-1 text-xs tracking-wide text-red-500 transition duration-500 transform border border-red-500 rounded-md w-max disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 focus:outline-none focus:shadow-outline"
                >
                  Estimate Gas
                </button>
              </>
            ) : (
              <button
                onClick={handleSubmit((values) =>
                  onClickTransaction(values, ele.name, "event")
                )}
                className="px-1 py-1 text-xs tracking-wide text-red-500 transition duration-500 transform border border-red-500 rounded-md w-max disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 focus:outline-none focus:shadow-outline"
              >
                Subscribe
              </button>
            )}
          </div>
          {contractResponse ? (
            <div className="w-full p-2 bg-gray-900 rounded">
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
