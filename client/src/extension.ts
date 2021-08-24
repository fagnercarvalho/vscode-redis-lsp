import { ExtensionContext } from 'vscode';

import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    DidChangeConfigurationNotification
} from 'vscode-languageclient';

import vscode = require('vscode');

let client: LanguageClient;

export function activate(context: ExtensionContext) {
    const config = getConfig();
    let serverOptions: ServerOptions = {
        command: "redis-lsp",
        args: [
            "-address", config.address, 
            "-username", config.username, 
            "-password", config.password, 
            "-database", config.database.toString(),
            // https://pkg.go.dev/flag#hdr-Command_line_flag_syntax
            "-dbCacheEnabled=" + String(config.dbCache)
        ]
    };

    let clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file',  language: '', pattern: '**/*.redis' }],
        synchronize: {
            // preferences starting with these will trigger didChangeConfiguration
            configurationSection: ['redis-lsp']
          },        
        middleware: {
            workspace: {
              didChangeConfiguration: () => {
                client.sendNotification(DidChangeConfigurationNotification.type, { settings: getConfig() });
              }
            }
          }
    };

    client = new LanguageClient(
        'redis-lsp-client',
        serverOptions,
        clientOptions,
    );
    client.start();

    const command = 'extension.runCommand';
        
    const commandHandler = () => {      
      const range = new vscode.Range(vscode.window.activeTextEditor.selection.start, vscode.window.activeTextEditor.selection.end);
      const selectedText = vscode.window.activeTextEditor.document.getText(range);

      vscode.commands.executeCommand("server.executeCommand", selectedText);
    };

    context.subscriptions.push(vscode.commands.registerCommand(command, commandHandler));
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}

function getConfig(): Config {
    const uri = vscode.window.activeTextEditor.document.uri
    const config = vscode.workspace.getConfiguration('redis-lsp', uri);
    return { 
        address: config['address'], 
        username: config['username'], 
        password: config['password'], 
        database: config['database'], 
        dbCache: config['db-cache']
    };
}

interface Config {
    address: string;
    username: string;
    password: string;
    database: number;
    dbCache: boolean;
}