import * as vscode from 'vscode';
import { IContainerProviderContrib, IJupyterServerUri, IJupyterUriProvider, IQuickPick, JupyterServerUriHandle } from './common/common';
import { SciPyContainerServerProvider } from './providers/scipyImageProvider';

export class ContainerServer implements IJupyterUriProvider {
    id: string = 'jupyter-docker-stack-connect';
    displayName: string = 'Jupyter Server from Docker Containers...';
    private _eventEmitter = new vscode.EventEmitter<void>();
    onDidChangeHandles = this._eventEmitter.event;
    private _logger: vscode.OutputChannel;
    private _contributions: IContainerProviderContrib[] = [];

    constructor(context: vscode.ExtensionContext) {
        this._logger = vscode.window.createOutputChannel('Jupyter Docker Stack');

        this._contributions = [
            new SciPyContainerServerProvider(this._logger)
        ];

        this._contributions.forEach(contribution => {
            context.subscriptions.push(contribution.onDidChangeHandles(() => this._eventEmitter.fire()));
        });
    }

    async getQuickPickEntryItems(): Promise<IQuickPick[]> {
        // get quick pick items from all contributions
        const items: IQuickPick[] = [];
        for (const contribution of this._contributions) {
            items.push(...(await contribution.getQuickPickEntryItems()));
        }
        
        return items;
    }
    async handleQuickPick(item: IQuickPick, backEnabled: boolean): Promise<string | undefined> {
        return item.execute(backEnabled);
    }
    async getServerUri(handle: JupyterServerUriHandle): Promise<IJupyterServerUri> {
        for (const contribution of this._contributions) {
            if (contribution.canHandle(handle)) {
                const serverUri = await contribution.getServerUri(handle);
                if (serverUri) {
                    return serverUri;
                }
            }
        }
        throw new Error('Invalid handle');
    }

    async getHandles(): Promise<string[]> {
        const handles: string[] = [];
        for (const contribution of this._contributions) {
            handles.push(...(await contribution.getHandles()));
        }

        return handles;
    }

    async removeHandle(handle: JupyterServerUriHandle): Promise<void> {
        for (const contribution of this._contributions) {
            if (contribution.canHandle(handle)) {
                await contribution.removeHandle(handle);
                return;
            }
        }
    }
}
