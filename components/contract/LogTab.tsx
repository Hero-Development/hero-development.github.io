import React from "react";
import { default as dayjs } from "dayjs";
import { useLogsStore } from "../../store/logs";
import { AppearTransition } from "../common/AppearTransition";

export const LogTab = () => {
  const { logs, clearLogs } = useLogsStore();
  console.log("LOGS", logs);
  return (
    <AppearTransition>
      <div className="max-w-md p-6 overflow-y-auto " style={{ height: "82vh" }}>
        <button
          className="w-full mb-3 text-sm text-right text-red-700"
          onClick={clearLogs}
        >
          Clear all
        </button>
        {logs.length ? (
          logs.map((log) => (
            <div
              key={log.id}
              className="pb-4 mt-2 text-xs border-b dark:border-gray-700"
            >
              <p className="">
                {`[${dayjs(log.createdAt).format(
                  "YYYY-MM-DD HH:mm:ss.SSS Z"
                )}]`}{" "}
              </p>
              <p className="italic">
                {log.method}
                {" - "}
                <span
                  className={`uppercase ${
                    log.type === "event"
                      ? "text-green-600"
                      : log.type === "function"
                      ? "text-blue-600"
                      : "text-yellow-600"
                  }`}
                >
                  {log.type}
                </span>
              </p>

              <p className="mt-1">Response: {JSON.stringify(log.data)}</p>
            </div>
          ))
        ) : (
          <p className="mt-16 text-center">No logs available</p>
        )}
      </div>
    </AppearTransition>
  );
};
