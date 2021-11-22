import { nanoid } from 'nanoid';
import create from 'zustand';

export type Log = {
  id: string;
  type: string;
  method: string;
  data: any;
  createdAt?: string;
};

type LogsStore = {
  logs: Log[];
  addLog: (log: Omit<Log, 'id'>) => void;
  clearLogs: () => void;
};

export const useLogsStore = create<LogsStore>((set) => ({
  logs: [],
  addLog: (log) =>
    set((state) => ({
      logs: [{ id: nanoid(), createdAt: new Date().toISOString(), ...log }, ...state.logs],
    })),
  clearLogs: () =>
    set(() => ({
      logs: [],
    })),
}));
