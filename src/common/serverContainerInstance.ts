import { spawn } from 'child_process';
import * as vscode from 'vscode';

import { IJupyterServerUri, JupyterServerUriHandle } from "./common";
import { parseTokenFromLog, spawnAsync } from './helpers';

export class JupyterServerContainer {
    constructor(
        readonly handle: JupyterServerUriHandle,
        readonly port: string,
        private _serverInfo: IJupyterServerUri | undefined,
        private _logger: vscode.OutputChannel
    ) {
    }

    async getServerInfo(): Promise<IJupyterServerUri> {
        if (!this._serverInfo) {
            this._serverInfo = await this._getServerInfo();
            return this._serverInfo;
        } else {
            return this._serverInfo;
        }
    }

    private async _getServerInfo(): Promise<IJupyterServerUri> {
        this._logger.appendLine(`Getting server info for ${this.handle}`);
        const start = await spawnAsync('docker', [
            'start',
            this.handle
        ]);

        if (start.code !== 0) {
            throw new Error('Failed to start container');
        }

        const containerLog = await spawnAsync('docker', [
            'container',
            'logs',
            this.handle
        ], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        if (containerLog.code !== 0) {
            throw new Error('Failed to get container logs');
        }

        const lines = containerLog.stdErr.split(/\r?\n/).reverse();

        let serverToken: string | undefined;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const token = parseTokenFromLog(line);
            if (token) {
                serverToken = token;
                break;
            }
        }

        if (!serverToken) {
            throw new Error('Failed to get server token');
        }

        this._logger.appendLine(`Fetch server token successfull`);

        // get port used in docker container
        const portPromise = new Promise<string>(resolve => {
            this._logger.appendLine(`Getting port for ${this.handle}`);
            const proc = spawn('docker', [
                'container',
                'port',
                this.handle
            ], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            proc.stdout.on('data', (data) => {
                this._logger.appendLine(`stdout port: ${data}`);
                const str = data.toString().trim();
                const port = str.split(':')[1];
                this._logger.appendLine(`port: ${port}`);
                resolve(port);
                proc.kill();
            });
        });

        const port = await portPromise;

        this._logger.appendLine(`Fetch port successfull`);
        return {
            baseUrl: `http://127.0.0.1:${port}`,
            token: serverToken,
            displayName: 'Scipy ' + this.handle.substring('jupyter-server-provider-containers-'.length),
            // eslint-disable-next-line @typescript-eslint/naming-convention
            authorizationHeader: { Authorization: `token ${serverToken}` },
        };
    }
}
