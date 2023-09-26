import * as vscode from 'vscode';
import { ContainerServer } from './serverProvider2';
import { Jupyter } from '@vscode/jupyter-extension';

export async function activate(context: vscode.ExtensionContext) {
    const jupyter = vscode.extensions.getExtension('ms-toolsai.jupyter');
    if (jupyter) {
        await jupyter.activate();
    }

    if (jupyter?.exports) {
        const api: Jupyter = jupyter.exports;
        const serverProvider = new ContainerServer(context);
        const collection = api.createJupyterServerCollection('jupyter-docker-stack-connect', 'Jupyter Server from Docker Containers...', serverProvider);
        collection.commandProvider = serverProvider;
    }
}

export function deactivate() {}