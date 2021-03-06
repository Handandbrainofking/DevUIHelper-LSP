/*
 * @Author: your name
 * @Date: 2020-05-15 12:53:58
 * @LastEditTime: 2020-06-06 08:19:47
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \DevUIHelper-LSP\server\src\DConnection.ts
 */ 
import {
	createConnection,
	ProposedFeatures,
	InitializeParams,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult,
	DidChangeConfigurationParams,
	HoverParams,
	Logger,
} from 'vscode-languageserver';
import { logger } from './server';
import { Host } from './Host/Host';
import { FileType } from './type';
import { SupportFrameName, ParseOption } from './parser/type';
export class DConnection{
	private connection = createConnection(ProposedFeatures.all);
	private host:Host;
	private logger:Logger;
	private igniteResult:ParseOption|undefined;
	constructor(host:Host,logger:Logger){
		this.addProtocalHandlers();
		this.host = host;
		this.logger = logger;
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
		if(params.rootPath){
		logger.debug(`Find Project At ${params.rootPath}`);
		this.igniteResult = this.host.igniter.ignite(params.rootPath);
		this.host.setParseOption(this.igniteResult);
		}
		return {
			capabilities: {
				textDocumentSync: TextDocumentSyncKind.Full,
				// Tell the client that the server supports code completion
				completionProvider: {
					resolveProvider: false,
					triggerCharacters: ['<','.', '-', '+', '[', ']','(','\"',' ',,'*','\@',',','a',
				'b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t',
			'u','v','w','x','y','z','1','2','3','4','5','6','7','8','9','0']
				},
				hoverProvider:true,
			}
		};
	}
	onInitialized(){
		logger.debug(`Welcome to DevUI Helper!`);
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
		// this.host.igniter.checkProjectFrameworkAndComponentName('c:\\MyProgram\\angular\\demo1');
		if(!this.igniteResult||this.igniteResult.frame===SupportFrameName.Null||this.igniteResult.components===[]){
			return [];
		}
		return this.host.completionProvider.provideCompletionItes(_textDocumentPosition,FileType.HTML);
	}
	onHover(_textDocumentPosition:HoverParams){
		if(!this.igniteResult||this.igniteResult.frame===SupportFrameName.Null||this.igniteResult.components===[]){
			return ;
		}
		return this.host.hoverProvider.provideHoverInfoForHTML(_textDocumentPosition);
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
