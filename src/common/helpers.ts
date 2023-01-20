import { spawn } from 'child_process';
import * as net from 'net';
import { IContainerServer } from './common';

export function parseServerInfoFromLog(data: string, port: string, handle: string) {
    const token = parseTokenFromLog(data);

    if (token) {
        const server: IContainerServer = {
            handle: handle,
            baseUrl: `http://127.0.0.1:${port}`,
            token: token,
            displayName: handle,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            authorizationHeader: { Authorization: `token ${token}` },
			workingDirectory: 'work'
        };
        return server;
    }

    return undefined;
};

export function parseTokenFromLog(data: string) {
    const url = data.match(/http:\/\/127\.0\.0\.1:8888\/lab\?token=([a-zA-Z0-9]+)/);

    if (url) {
        const token = url[1];
        return token;
    }
    return undefined;
}


export async function getPortFree(): Promise<string> {
    return new Promise<string>(res => {
        const srv = net.createServer();
        srv.listen(0, () => {
			const address = srv.address();
			if (!address) {
				throw new Error('No address found');
			}
			if (typeof address === 'string') {
				throw new Error('Address is a string');
			} else {
				const port = address.port;
				srv.close((err: any) => res(String(port)));
			}
        });
    });
}

export function spawnAsync(command: string, args: string[], options?: any) {
	return new Promise<{ code: number | null; hasStdErr: boolean | null, stdOut: string, stdErr: string }>((resolve) => {
		const stdout: Buffer[] = [];
		const stderr: Buffer[] = [];
		const proc = spawn(command, args, { shell: true, ...options });
		proc.stdout.on('data', (data) => {
			stdout.push(data);
		});

		proc.stderr.on('data', (data) => {
			stderr.push(data);
		});

		proc.on('close', (code) => {
			const stdoutBuffer = Buffer.concat(stdout).toString();
			const stderrBuffer = Buffer.concat(stderr).toString();
			resolve({ code, hasStdErr: stderr.length > 0, stdOut: stdoutBuffer, stdErr: stderrBuffer });
		});
	});
}