import { JupyterServer } from '@vscode/jupyter-extension';
import * as vscode from 'vscode';

export type JupyterServerUriHandle = string;

export interface IJupyterServerUri {
    baseUrl: string;
    token: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    authorizationHeader: any; // JSON object for authorization header.
    expiration?: Date; // Date/time when header expires and should be refreshed.
    displayName: string;
    workingDirectory?: string;
}

export interface IJupyterUriProvider {
    readonly id: string;
    displayName?: string;
    onDidChangeHandles: vscode.Event<void>;
    getQuickPickEntryItems(): Promise<vscode.QuickPickItem[]> | vscode.QuickPickItem[];
    handleQuickPick?(item: vscode.QuickPickItem, backEnabled: boolean): Promise<JupyterServerUriHandle | 'back' | undefined>;
    getServerUri(handle: JupyterServerUriHandle): Promise<IJupyterServerUri>;
    getHandles(): Promise<JupyterServerUriHandle[]>;
    removeHandle(handle: JupyterServerUriHandle): Promise<void>;
}

export interface IContainerProviderContrib {
    onDidChangeHandles: vscode.Event<void>;
    canHandle(handle: JupyterServerUriHandle): boolean;
    getServerUri(handle: JupyterServerUriHandle): Promise<IJupyterServerUri>;
    getHandles(): Promise<JupyterServerUriHandle[]>;
    removeHandle(handle: JupyterServerUriHandle): Promise<void>;
    getQuickPickEntryItems(): IQuickPick[];
}


export interface IQuickPick extends vscode.QuickPickItem {
    id: string;
    title: string;
    execute: (backEnabled: boolean) => Promise<JupyterServer | 'back' | undefined>;
}

export interface IContainerServer extends IJupyterServerUri {
    handle: string;
}
