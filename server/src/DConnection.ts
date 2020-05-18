/*
 * @Author: your name
 * @Date: 2020-05-15 12:53:58
 * @LastEditTime: 2020-05-18 21:56:27
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \DevUIHelper-LSP\server\src\DConnection.ts
 */ 
import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentChangeEvent,
	Proposed,
	TextDocumentSyncKind,
	PublishDiagnosticsNotification,
	InitializeResult,
	DidChangeConfigurationParams,
	HoverParams,
	Logger,
} from 'vscode-languageserver';
import { textChangeRangeIsUnchanged } from 'typescript/lib/tsserverlibrary';
import { logger } from './server';
import { Host } from './Host';
import { FileType } from './type';
export class DConnection{
	private connection = createConnection(ProposedFeatures.all);
	private host:Host;
	private logger:Logger;
	constructor(host:Host,logger:Logger){
		this.addProtocalHandlers();
		this.host = host;
		this.logger = logger
	}
	addProtocalHandlers(){
		this.connection.onInitialize(e=>this.onInitialze(e));
		this.connection.onInitialized(()=>this.onInitialized);
		this.connection.onDidChangeConfiguration(e=>this.onDidChangeConfiguration);
		this.connection.onHover(e=>this.onHover(e));
		this.connection.onCompletion(e=>this.onCompletion(e));
	}
	onInitialze(params:InitializeParams):InitializeResult{
		let capabilities = params.capabilities;
		logger.debug(params.rootPath);
		return {
			capabilities: {
				textDocumentSync: TextDocumentSyncKind.Full,
				// Tell the client that the server supports code completion
				completionProvider: {
					resolveProvider: false,
					triggerCharacters: ['<', '-', '+', '[', '(','\"',' ','\n']
				},
				hoverProvider:true,
			}
		};
	}
	onInitialized(){
		logger.debug(`Welcome to DevUI Helper!`)
		// if (hasConfigurationCapability) {
		// 	// Register for all configuration changes.
		// 	connection.client.register(DidChangeConfigurationNotification.type, undefined);
		// }
		// if (hasWorkspaceFolderCapability) {
		// 	connection.workspace.onDidChangeWorkspaceFolders(_event => {
		// 		connection.console.log('Workspace folder change event received.');
		// 	});
		// }
	}
	onDidChangeConfiguration(change:DidChangeConfigurationParams ){
		// if (hasConfigurationCapability) {
		// 	// Reset all cached document settings
		// 	documentSettings.clear();
		// } else {
		// 	globalSettings = <ExampleSettings>(
		// 		(change.settings.languageServerExample || defaultSettings)
		// 	);
		// }
	}
	onCompletion(_textDocumentPosition: TextDocumentPositionParams){
		// logger.debug(`Completion work`);		
		// logger.debug(`cursorOffset at : ${this.host.documents.get(_textDocumentPosition.textDocument.uri)?.offsetAt(_textDocumentPosition.position) }`);
		const _textDocument = this.host.documents.get(_textDocumentPosition.textDocument.uri);
		return this.host.completionProvider.provideCompletionItes(_textDocumentPosition,FileType.HTML);
	}
	onHover(_textDocumentPosition:HoverParams){
		logger.debug(`HoverProvider works!`);
		logger.debug(`cursorOffset at : ${this.host.documents.get(_textDocumentPosition.textDocument.uri)?.offsetAt(_textDocumentPosition.position) }`)
		return this.host.hoverProvider.provideHoverInfoForHTML(_textDocumentPosition)
	}
	listen(){
		this.connection.listen();
		this.host.documents.listen(this.connection);
	}
	info(msg:string){
		this.logger.info(msg);
	}
	// debug(msg:string){
	// 	logger.debug(msg);
	// }
}
