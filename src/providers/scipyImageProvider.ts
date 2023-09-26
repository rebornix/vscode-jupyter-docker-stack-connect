import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { getPortFree, parseServerInfoFromLog, spawnAsync } from '../common/helpers';
import { IContainerProviderContrib, IJupyterServerUri, IQuickPick, JupyterServerUriHandle } from '../common/common';
import { JupyterServerContainer } from '../common/serverContainerInstance';
import { JupyterServer } from '@vscode/jupyter-extension';

export class SciPyContainerServerProvider implements IContainerProviderContrib {
    private _handles: JupyterServerContainer[] = [];
    private _eventEmitter = new vscode.EventEmitter<void>();
    onDidChangeHandles = this._eventEmitter.event;
    private _initHandlesPromise: Promise<void>;

    constructor(private _logger: vscode.OutputChannel) {
        this._initHandlesPromise = this._init();
    }

    canHandle(handle: JupyterServerUriHandle): boolean {
        return this._handles.some(h => h.handle === handle);
    }

    private async _init() {
        this._logger.appendLine('Initializing container servers');
        // docker ps find all containers for image
        const parseContainersPromise = new Promise<JupyterServerContainer[]>(resolve => {
            try {
                const proc = spawn('docker', [
                    'ps',
                    '-a',
                    '--filter',
                    'ancestor=jupyter/scipy-notebook:85f615d5cafa',
                    '--format',
                    '{{.ID}} {{.Names}} {{.Status}}'
                ], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                proc.stdout.on('data', (data) => {
                    this._logger.appendLine(`ps stdout: ${data}`);
                    // parse data to get docker container id and name
                    const servers = [];
                    const lines = data.toString().split(/\r?\n/);
                    for (const line of lines) {
                        const matches = /^(\w+)\s([\w\-]+)\s(.*)/.exec(line);
                        if (matches && matches.length === 4) {
                            const containerId = matches[1];
                            const handleId = matches[2];
                            const status = matches[3];
                            this._logger.appendLine(`containerId: ${containerId}, handleId: ${handleId}, status: ${status}`);
                            const server = new JupyterServerContainer(handleId, '8888', undefined, this._logger);
                            servers.push(server);
                        }
                    }

                    resolve(servers);
                });

                proc.stderr.on('data', (data) => {
                    this._logger.appendLine(`ps stderr: ${data}`);
                });

                proc.on('close', (code) => {
                    this._logger.appendLine(`ps child process exited with code ${code}`);
                    resolve([]);
                });

            } catch(ex) {
                this._logger.appendLine(`Docker PS Error: ${ex}`);
                resolve([]);
            }

        });

        const servers = await parseContainersPromise;
        this._handles = servers;
        this._eventEmitter.fire();
    }

    getQuickPickEntryItems(): IQuickPick[] {
        return [
            {
                id: 'connect-scientific-python',
                title: 'Scientific Python Stack (jupyter/scipy-notebook)',
                label: 'Scientific Python Stack (jupyter/scipy-notebook)',
                detail: 'jupyter/scipy-notebook:85f615d5cafa',
                execute: this.execute.bind(this)
            }
        ];
    }

    async execute(backEnabled: boolean): Promise<JupyterServer | undefined> {
        return vscode.window.withProgress<JupyterServer | undefined>({ location: vscode.ProgressLocation.Notification, title: 'Starting Jupyter Server' }, async (progress) => {
            const promise = new Promise<JupyterServer | undefined>(async resolve => {

                // start a process to run docker container and listen and parse its output
                // find a free port to use for the container

                const port = await getPortFree();
                this._logger.appendLine(`Using port ${port}`);
                // generate a random handle id
                const handleId = 'jupyter-server-provider-containers-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                progress.report({ message: `Building container jupyter/scipy-notebook:85f615d5cafa` });

                const args = [
                    'run',
                    // '-it',
                    '-a', 'stdin', '-a', 'stdout', '-a','stderr',
                    '-p', `${port}:8888`
                ];

                // check workspace

                const activeDocument = vscode.window.activeNotebookEditor?.notebook;
                if (activeDocument) {
                    const workspaceFolder = vscode.workspace.getWorkspaceFolder(activeDocument.uri);
                    if (workspaceFolder) {
                        args.push('-v', `${workspaceFolder.uri.fsPath}:/home/jovyan/work`);
                    }
                }

                args.push(...[
                    '--name',
                    handleId,
                    'jupyter/scipy-notebook:85f615d5cafa',
                    'start-notebook.sh',
                    '--NotebookApp.notebook_dir=/home/jovyan/work/',
                    // '--notebook-dir=/home/jovyan/work/',
                    '--NotebookApp.allow_origin_pat=.*',
                    './',
                    '--no-browser'
                ]);

                const serverProcess = spawn('docker', args, {
                    stdio: ['pipe', 'pipe', 'pipe']
                });
                serverProcess.stdout.on('data', (data) => {
                    this._logger.appendLine(`docker run stdout: ${data}`);
                });
                let handled = false;
                serverProcess.stderr.on('data', (data) => {
                    // parse stderr for the url and token
                    const str = data.toString();
                    this._logger.appendLine(`docker run stderr: ${str}`);

                    if (handled) {
                        return;
                    }

                    const info = parseServerInfoFromLog(str, port, handleId);
                    if (info) {
                        const server = new JupyterServerContainer(
                            handleId,
                            port,
                            info,
                            this._logger
                        );

                        this._logger.appendLine(`Adding server ${handleId} to list of handles`);

                        this._handles.push(server);
                        handled = true;
                        progress.report({ increment: 100 });
                        resolve({
                            id: handleId,
                            label: 'Scipy ' + handleId.substring('jupyter-server-provider-containers-'.length),
                            connectionInformation: {
                                baseUrl: vscode.Uri.parse(info.baseUrl),
                                token: info.token,
                                headers: info.authorizationHeader
                            },
                            // still proposed
                            mappedRemoteDirectory: vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri : undefined // info.workingDirectory ? vscode.Uri.parse(info.workingDirectory) : undefined
                        } as JupyterServer);
                        this._eventEmitter.fire();
                    }
                });
                serverProcess.on('close', (code) => {
                    this._logger.appendLine(`docker run child process exited with code ${code}`);
                    this._handles = this._handles.filter(h => h.handle !== handleId);
                    this._eventEmitter.fire();
                });
            });

            return promise;
        });
    }

    async getServerUri(handle: JupyterServerUriHandle): Promise<IJupyterServerUri> {
        const info = this._handles.find(h => h.handle === handle);
        if (!info) {
            throw new Error('Invalid handle');
        }
        return info.getServerInfo();
    }

    async getHandles(): Promise<string[]> {
        await this._initHandlesPromise;
        return this._handles.map(h => h.handle);
    }

    async removeHandle(handle: JupyterServerUriHandle): Promise<void> {
        this._handles = this._handles.filter(h => h.handle !== handle);

        try {
            const result = await spawnAsync('docker', [
                'rm',
                '-f',
                handle
            ]);
            this._logger.appendLine(`docker rm -f ${handle} exited with code ${result.code}`);
            // assert.strictEqual(result.code, 0, 'Expect zero exit code');
        } catch (error) {
            this._logger.appendLine(`Error thrown when removing handle ${handle}`);
        }	

        this._eventEmitter.fire();
    }
}
