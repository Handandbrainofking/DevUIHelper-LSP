/*
 * @Author: your name
 * @Date: 2020-04-08 20:38:08
 * @LastEditTime: 2020-04-11 21:23:46
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \DevUIHelper-LSP\server\src\completion.ts
 */
import{converStringToName}from './util';
import { HTMLInfoNode } from './source/html_info';
import{htmlSourceTreeRoot,parser} from'./server'; 
import { Spankind } from './parser/type';
import{CompletionItem} from 'vscode-languageserver';
import { HTMLAST } from './parser/ast';
import { TextDocument } from 'vscode-languageserver-textdocument';
export class CompletionProvider{
	private currentDocument:TextDocument|undefined;
	private astToInfoMap:Map<HTMLAST,HTMLInfoNode>|undefined;
	private text:string = '';
 constructor(){}
 	provideCompletionItemsForHTML(_offset:number,_textDocument:TextDocument): CompletionItem[] {
	
	//分析及初始化

	const parseResult = parser.searchTerminalAST(_offset,_textDocument.uri);
	let{noCompletionFlag,spanKind,terminalNode,HTMLAstToHTMLInfoNode} = parseResult;
	if(noCompletionFlag == true)
		return [];

	this.currentDocument  = _textDocument;
	this.astToInfoMap = HTMLAstToHTMLInfoNode;
	this.text= this.currentDocument!.getText();
	

	
	// 请参照文档中，理解key value的不同提示方式
	if(spanKind==Spankind.KEY){
		terminalNode= terminalNode?.getparent();
	}
	if(terminalNode){
		return this.getHTMLCompletion(terminalNode,HTMLAstToHTMLInfoNode);
	}
	return [];

	}

	getHTMLCompletion(terminalNode:HTMLAST,map:Map<HTMLAST,HTMLInfoNode>):CompletionItem[]{
		if(!terminalNode){
			throw Error(`出现了现有parser所不能理解的问题，请检测parser是否被修改`);
		}
		let _htmlInfoNode = map.get(terminalNode);
		if(_htmlInfoNode){
			return _htmlInfoNode.getCompltionItems();
		}
		 _htmlInfoNode = this.findHTMLInfoNode(terminalNode);
		if(_htmlInfoNode){
			return _htmlInfoNode.getCompltionItems();
		}
		return [];
	}

	findHTMLInfoNode(_htmlast:HTMLAST):HTMLInfoNode|undefined{

		//表内存在则直接返回
		let res = this.astToInfoMap?.get(_htmlast);
		if(res){return res;}

		//表内没有则向上递归
		let _parentast = _htmlast.getparent();
		if(!_parentast){
			let _htmlroot = htmlSourceTreeRoot;
			this.astToInfoMap!.set(_htmlast,_htmlroot);
			return _htmlroot;
		}
		else{
			let _parentInfoNode = this.astToInfoMap!.get(_parentast)
			if(!_parentInfoNode){
				 _parentInfoNode = this.findHTMLInfoNode(_parentast);
			}
			if(_parentInfoNode){
				let {start,end} = _htmlast.getKeySpan();
				let _infoNodeName = converStringToName(this.text.substring(start,end+1));
				let _currentInfoNode = _parentInfoNode?.getsubNode(_infoNodeName);

				if(_currentInfoNode){
					this.astToInfoMap!.set(_htmlast,_currentInfoNode);
				}
				return _currentInfoNode;
			}

		}
		

	}
}