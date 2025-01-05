import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { ScourFile } from './util/scourFormat';

contextBridge.exposeInMainWorld('electronAPI', {
    invoke: (channel: string, args?: any): Promise<any> => ipcRenderer.invoke(channel, args),

    send: (channel: string, args?: any): void => ipcRenderer.send(channel, args),

    on: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void): void => {
        ipcRenderer.on(channel, listener);
    },

    once: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void): void => {
        ipcRenderer.once(channel, listener);
    },

    navigateTo: (page: string): void => ipcRenderer.send('navigate-to', page),

    showInfo: (title: string, message: string) => ipcRenderer.invoke('show-info', { title, message }),

    getScourFile: async () => ipcRenderer.invoke('get-scour-file'),
    setScourFile: (incomingScourFile: ScourFile) => ipcRenderer.invoke('set-scour-file', incomingScourFile),

    createSearchQueries: async () => ipcRenderer.invoke('create-search-queries'),
    runSearch: async () => ipcRenderer.invoke('run-search'),
    parsePages: async () => ipcRenderer.invoke('parse-pages'),

    exportCsv: async(csvPath: string) => ipcRenderer.invoke('export-csv', csvPath),
    loadPreference: async(key: string) => ipcRenderer.invoke('load-preference', key),
    savePreference: async(key: string, value: any) => ipcRenderer.invoke('save-preference', key, value),

    getFormattedDebugLog: async() => ipcRenderer.invoke('get-formatted-debug-log'),
    getAppVersion: async() => ipcRenderer.invoke('get-app-version'),
});
