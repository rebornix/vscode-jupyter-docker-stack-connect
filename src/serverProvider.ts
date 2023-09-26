import * as vscode from 'vscode';
import { IContainerProviderContrib, IJupyterServerUri, IJupyterUriProvider, IQuickPick, JupyterServerUriHandle } from './common/common';
import { SciPyContainerServerProvider } from './providers/scipyImageProvider';
import { JupyterServer, JupyterServerCommand, JupyterServerCommandProvider, JupyterServerProvider } from '@vscode/jupyter-extension';

export class ContainerServer implements JupyterServerProvider, JupyterServerCommandProvider {
    private _eventEmitter = new vscode.EventEmitter<void>();
    onDidChangeServers: vscode.Event<void> = this._eventEmitter.event;
    private _logger: vscode.OutputChannel;
    private _contributions: IContainerProviderContrib[] = [];
    private _commands: (JupyterServerCommand & IQuickPick)[];

    get commands() {
        return this._commands;
    }

    constructor(context: vscode.ExtensionContext) {
        this._logger = vscode.window.createOutputChannel('Jupyter Docker Stack');

        this._contributions = [
            new SciPyContainerServerProvider(this._logger)
        ];

        let commands: (JupyterServerCommand & IQuickPick)[] = [];

        this._contributions.forEach(contribution => {
            context.subscriptions.push(contribution.onDidChangeHandles(() => this._eventEmitter.fire()));

            const quickPicks = contribution.getQuickPickEntryItems();
            commands.push(...quickPicks);
        });

        this._commands = commands;
    }

    async provideJupyterServers(token: vscode.CancellationToken): Promise<JupyterServer[]> {
        const promises: Promise<string[]>[] = [];
        this._contributions.forEach(contribution => {
            promises.push(contribution.getHandles());
        });

        return Promise.all(promises).then(servers => {
            const result: JupyterServer[] = [];
            servers.forEach(s => result.push(...s.map(handle => ({
                id: handle,
                label: 'Scipy ' + handle.substring('jupyter-server-provider-containers-'.length),
            }))));
            return result;
        });
    }

    async provideCommands(value: string | undefined, token: vscode.CancellationToken): Promise<JupyterServerCommand[]> {
        return this._commands;
    }

    async handleCommand(command: JupyterServerCommand, token: vscode.CancellationToken): Promise<JupyterServer | undefined> {
        const commandWithQuickPick = command as JupyterServerCommand & IQuickPick;

        if (commandWithQuickPick.execute) {
            const result = await commandWithQuickPick.execute(true);
            if (result === 'back') {
                return undefined;
            } else if (result) {
                return result;
            } else {
                throw new vscode.CancellationError();
            }
        }

        return undefined;
    }

    async resolveJupyterServer(server: JupyterServer, token: vscode.CancellationToken): Promise<JupyterServer> {
        for (const contribution of this._contributions) {
            if (contribution.canHandle(server.id)) {
                const serverUri = await contribution.getServerUri(server.id);
                if (serverUri) {
                    return {
                        id: server.id,
                        label: serverUri.displayName ?? server.label,
                        connectionInformation: {
                            baseUrl: vscode.Uri.parse(serverUri.baseUrl),
                            token: serverUri.token,
                            headers: serverUri.authorizationHeader
                        },
                        // still proposed
                        mappedRemoteDirectory: vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri : undefined // serverUri.workingDirectory ? vscode.Uri.parse(serverUri.workingDirectory) : undefined
                    } as JupyterServer;
                }
            }
        }

        throw new Error('Invalid handle');
    }
}
