import React, { useState } from "react";
import { default as dayjs } from "dayjs";
import { useLogsStore } from "../../store/logs";
import { useEventLogsStore } from "../../store/eventLog";
import { AppearTransition } from "../common/AppearTransition";

export const LogTab = () => {
  const { logs, clearLogs } = useLogsStore();
  const { eventLogs, clearEventLogs } = useEventLogsStore();
  const [isEventLog, setIsEventLog] = useState(false);

  const selectedLog = !isEventLog ? eventLogs : logs;

  return (
    <AppearTransition>
      <div className=" p-6 overflow-y-auto " style={{ height: "82vh" }}>
        <div className="flex justify-between w-full">
          <button
            className=" mb-3 text-sm  text-red-500"
            onClick={() => setIsEventLog((prev) => !prev)}
          >
            {isEventLog ? "Show Event Logs" : "Show Contract Logs"}
          </button>
          <button
            className=" mb-3 text-sm  text-red-500"
            onClick={!isEventLog ? clearEventLogs : clearLogs}
          >
            Clear all
          </button>
        </div>
        {selectedLog.length ? (
          selectedLog.map((log) => (
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

              <p className="mt-1 break-all">
                Response: {JSON.stringify(log.data)}
              </p>
            </div>
          ))
        ) : (
          <p className="mt-16 text-center">No logs available</p>
        )}
      </div>
    </AppearTransition>
  );
};
