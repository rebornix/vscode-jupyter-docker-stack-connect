import * as vscode from 'vscode';
import { ContainerServer } from './serverProvider';

export async function activate(context: vscode.ExtensionContext) {
    const jupyter = vscode.extensions.getExtension('ms-toolsai.jupyter');
    if (jupyter) {
        await jupyter.activate();
    }

    if (jupyter?.exports) {
        const api = jupyter.exports;
        const localServer = new ContainerServer(context);
        api.registerRemoteServerProvider(localServer);
    }
}

export function deactivate() {}