/*
 * @Author: your name
 * @Date: 2020-04-08 20:38:08
 * @LastEditTime: 2020-06-06 19:15:49
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \DevUIHelper-LSP\server\src\completion.ts
 */
import { adjustSpanToAbosulutOffset, getRangeFromDocument, getsubstringForSpan, autoSelectCompletionRangeKind, getRangefromSpan, convertSpanToRange } from './util';
import {   Component,} from './source/html_info';
import { host, logger } from './server';
import { CompletionItem, Range, HoverParams, TextDocumentPositionParams } from 'vscode-languageserver';
import { HTMLAST, HTMLTagAST, HTMLCommentAST } from './parser/ast';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { FileType, CompletionSearchResult, CompletionType, CompletionRangeKind } from './type';
import { SearchResultType, SupportFrameName } from './parser/type';
import { Span } from './DataStructure/type';
import { SnapShot } from './Host/Host';
import { WhiteChars, Space, WhiteCharsAndGTAndSPLASH, WhiteCharsAndLTAndLTANDSPLASH, newLine } from './parser/chars';
import { forEachTrailingCommentRange } from 'typescript/lib/tsserverlibrary';

export class CompletionProvider {
	private tabCompletionFlag = true;

	constructor() { }
	provideCompletionItes(_params: TextDocumentPositionParams, type: FileType): CompletionItem[] {
		// host.igniter.loadSourceTree();
		// host.igniter.loadSourceTree();
		logger.debug(`completionWorks!`);
		let { textDocument, position } = _params;
		let _textDocument = host.getDocumentFromURI(textDocument.uri);
		let _offset = _textDocument.offsetAt(position);
		// host.igniter.parseTextDocument(_textDocument,{frameName:SupportFrameName.Angular,tagMarkedPrefixs:[]})
		if (type === FileType.HTML) {
			return this.provideCompletionItemsForHTML(_offset, _textDocument);
		} else {
			return [];
		}
	}
	provideCompletionItemsForHTML(_offset: number, _textDocument: TextDocument): CompletionItem[] {
		let { node, span, ast, type,expressionParams } = this.searchTerminalASTForCompletion(_offset, _textDocument);
		if (!node || type === CompletionType.NONE) {
			return [];
		}
		if(type===CompletionType.Expression){
			// return host.expressionAdm.createCompletion(expressionParams);
			return [];
		}
		let _range = convertSpanToRange(_textDocument, span);
		if (node instanceof Component && ast instanceof HTMLTagAST) {
			return this.CompletionItemsFactory(node, ast, type, _range);
		}
		if (!_range) {
			return node.getFullCompltionItems();
		}
		//TODO : 会不会出现没有name的情况呢？
		if (type === CompletionType.FUll) {
			if (node === host.HTMLComoponentSource) {
				let _fullCompletionFlag = ast.getSpan() !== ast.nameSpan;
				if (_fullCompletionFlag) {
					return node.getFullCompltionItems(_range, _fullCompletionFlag);
				}
			}
			return node.getFullCompltionItems(_range);
		} else {
			return node.getNameCompltionItems(_range);
		}
	}

	searchTerminalASTForCompletion(offset: number, textDocument: TextDocument): CompletionSearchResult {
		let { ast, type } = host.hunter.searchTerminalAST(offset - 1, textDocument.uri);
		if (!ast) { throw Error(`this offset does not in any Node :${offset}`); }
		switch (type) {
			case (SearchResultType.Content):
				if (ast instanceof HTMLTagAST) {
					let result = host.expressionAdm.getExpression(offset-1,textDocument.getText());
					return ({ node: host.HTMLComoponentSource, 
						span: undefined, ast: ast, type: CompletionType.Expression,
						expressionParams:{expression:result.res,span:result.span,textDocument:textDocument}});
				}
			case (SearchResultType.Name): {
				this.tabCompletionFlag = true;
				let _autoSwitchFlag = (ast.getSpan().end - ast.nameSpan.end) > 3;
				let _span = _autoSwitchFlag ? ast.nameSpan : ast.getSpan();
				if (ast instanceof HTMLTagAST && !_autoSwitchFlag) {
					_span.start++;
				}
				let _type = _autoSwitchFlag ? CompletionType.Name : CompletionType.FUll;
				adjustSpanToAbosulutOffset(ast, _span);
				if (ast instanceof HTMLTagAST) {
					return ({ node: host.HTMLComoponentSource, span: _span, ast: ast, type: _type });
				}
				return { node: host.hunter.findHTMLInfoNode(ast.parentPointer, textDocument.uri), span: _span, ast: ast.parentPointer!, type: _type };
			}
			case (SearchResultType.Value): {
				if (this.getCompletionFlag(textDocument.getText(), offset)) {
					return { node: host.hunter.findHTMLInfoNode(ast, textDocument.uri), span: undefined, ast: ast, type: CompletionType.FUll };
				}
			}
			case (SearchResultType.Null): return { node: undefined, span: undefined, ast: new HTMLCommentAST(), type: CompletionType.FUll };
		}

	}
	getCompletionFlag(text: string, offset: number): boolean {
		if (offset <= 2) {
			return true;
		}
		if (WhiteChars.indexOf(text.charCodeAt(offset - 1)) !== -1) {
			let _number = text.charCodeAt(offset - 2);
			if (Space.indexOf(text.charCodeAt(offset - 2)) !== -1) {
				let _offset = offset - 2;
				while (Space.indexOf(text.charCodeAt(_offset)) !== -1) {
					_offset--;
				}
				if (newLine.indexOf(text.charCodeAt(_offset)) !== -1) {
					if (this.tabCompletionFlag) {
						this.tabCompletionFlag = false;
						return true;
					}
				}
				return false;
			}
			else if (offset === text.length || WhiteCharsAndLTAndLTANDSPLASH.indexOf(text.charCodeAt(offset + 1)) !== -1) {
				return true;
			}
		}
		return false;
	}
	CompletionItemsFactory(node: Component, ast: HTMLTagAST, type: CompletionType, range?: Range): CompletionItem[] {
		let _attrsCompletion: CompletionItem[] = [];
		let _directiveCompletion:CompletionItem[] = [];
		let _directiveWithName:string[] = [];
		// let _comAttrs:CompletionItem[]=[];
		let _directives:any = ast.attrList!.directive.getEach(e => e.getName());
		let _attrs:any = ast.attrList!.attr.getEach(e => e.getName());

		//_attrs清洗
		_attrs = _attrs.map(e=>(e.replace(/\[|\(|\)|\]/g,"")));

		//找到指令节点
		let _directiveNodes = _directives?.map(name => {
			return host.HTMLDirectiveSource.getSubNode(name);
		});
		//加载伪装成attr的directive
		_attrs?.forEach(attrName => {
			let _tempdirective = host.HTMLDirectiveSource.getDirectiveWithNameSet()[attrName];
			if (_tempdirective){
				_directiveNodes.push(_tempdirective);
			}
		});

		//加载directive自身
		_directiveCompletion.push(...host.HTMLDirectiveSource.getNameCompltionItems().filter(e=>{
			for (let directive of [_directiveNodes]) {
				if (e===directive)
					return false;
			}
			return true;
		}));

		// 属性加载
		_directiveNodes?.forEach(directiveNode => {
			if (directiveNode)
				_attrsCompletion.push(...directiveNode.getFullCompltionItems(range));
			}
		);
		_attrsCompletion.push(...node.getFullCompltionItems(range));

		//属性清洗
		_attrsCompletion = _attrsCompletion.filter((e) => {
			for (let name of _attrs) {
				if (e.label.indexOf(name)!==-1)
					return false;
			}
			return true;
		});
		// //带range的加载
		// if (type === CompletionType.FUll && range) {

		// 	_attrsCompletion = _attrsCompletion.filter((e) => {
		// 		for (let name of _attrs!) {
		// 			if (name.includes(e.label))
		// 				return false;
		// 		}
		// 		return true;
		// 	});
		// 	return _attrsCompletion;
		// } 
		// //不带range的加载
		// else {
		// 	let _attrResult = [];
		// 	_attrResult.push(...node.getFullCompltionItems());
		// 	// _directivesNodes?.forEach(node => {
		// 	// 	if (node)
		// 	// 	_attrResult.push(...node.getFullCompltionItems());
		// 	// });

		if(!range&&_attrsCompletion.length>30){
			return _attrsCompletion;
		}
		return [..._attrsCompletion,..._directiveCompletion];
		
	}
}