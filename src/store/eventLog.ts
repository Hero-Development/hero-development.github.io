import { nanoid } from 'nanoid';
import create from 'zustand';

export type EventLog = {
  id: string;
  type: string;
  method: string;
  data: any;
  createdAt?: string;
};

type EventLogsStore = {
  eventLogs: EventLog[];
  addEventLog: (eventlog: Omit<EventLog, 'id'>) => void;
  clearEventLogs: () => void;
};

export const useEventLogsStore = create<EventLogsStore>((set) => ({
  eventLogs: [],
  addEventLog: (eventLog) =>
    set((state) => ({
      eventLogs: [
        { id: nanoid(), createdAt: new Date().toISOString(), ...eventLog },
        ...state.eventLogs,
      ],
    })),
  clearEventLogs: () =>
    set(() => ({
      eventLogs: [],
    })),
}));
