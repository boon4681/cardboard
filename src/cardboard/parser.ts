import { writeFileSync } from "fs"
import path from "path"
import { Tokenizer } from "pulpboard"
import { Lexer } from "./lexer"
import { Node, ParserScheme, Visitor } from "./parser_scheme"
import { Box, Expression, Group, Header, IfStatement, LexerDeclaration, Wrapper } from "./type"

const header_scheme = new ParserScheme('Header',
    `
header
`
)

const lexer_scheme = new ParserScheme('LexerDeclaration',
    `
@bind[
    lexer.bind -> ignore
    lexer.bind.punctuation.open -> ignore
    lexer.bind.name
    lexer.bind.punctuation.close -> ignore
]?
lexer.keyword -> $keyword
lexer.name -> $name
lexer.block.open -> ignore
@children(
    !lexer -> #LexerDeclaration
    !expr -> #Expression
    !if -> #IfStatement
    !group -> #Group
    !wrapper -> #Wrapper
)*
lexer.block.close -> ignore
`
)

const expr_scheme = new ParserScheme('Expression',
    `
expr.variable -> $name
expr.assignment -> ignore
(
    strings
    cardboard.metadata
    lexer.name
    !group -> #Group
    !wrapper -> #Wrapper
)*
@action[
    expr.options.start -> ignore
    identifier -> $name
    @argument[
        expr.options.option.punctuation.open -> ignore
        identifier
        expr.options.option.punctuation.close -> ignore
    ]?
]?
expr.end -> ignore
`
)

const if_scheme = new ParserScheme('IfStatement',
    `
if.keyword -> ignore
if.condition.open -> ignore
(
    strings
)
if.condition.close -> ignore
if.block.open -> ignore
(
    !expr -> #Expression
    !if -> #IfStatement
)*
if.block.close -> ignore
@stop[
    if.block.stop.start -> ignore
    if.block.stop -> ignore
]?
`
)

const group_scheme = new ParserScheme('Group',
    `
group.children.open -> ignore
(
    !expr -> #Expression
)*
group.children.close -> ignore
?group.mode -> $mode
`
)
const wrapper_scheme = new ParserScheme('Wrapper',
    `
wrapper.children.open -> ignore
(
    !expr -> #Expression
)*
wrapper.children.close -> ignore
?wrapper.mode -> $mode
`
)

const box_scheme = new ParserScheme('Box',
    `
    header -> #Header
    header -> #Header
    (
        !lexer -> #LexerDeclaration
    )*
    `
)

class TreeVisitor implements Visitor {
    constructor(
        public lexer: Lexer
    ) { }
    stack: Tokenizer<string, any>[] = []
    visitBox(node: Box) {
        node.acceptChildren(this)
    }
    visitHeader(node: Header) { }
    visitLexerDeclaration(node: LexerDeclaration) {
        node.acceptChildren(this)
    }
    visitExpression(node: Expression) {
        node.acceptChildren(this)
    }
    visitStrings(node: Node) { }
    visitIfStatement(node: IfStatement) { }

    visitWrapper(node: Wrapper) { }
    visitGroup(node: Group) { }
    visitLexerName(node: Node) { }
    visitCardboardMetadata(node: Node) { }
}

const scheme = {
    'Header': header_scheme,
    'LexerDeclaration': lexer_scheme,
    'Expression': expr_scheme,
    'IfStatement': if_scheme,
    'Group': group_scheme,
    'Wrapper': wrapper_scheme
}

// writeFileSync(path.join(__dirname, 'type.ts'), 'import { Node } from "./parser_scheme";\n' + [
//     header_scheme, lexer_scheme, expr_scheme, if_scheme, group_scheme, wrapper_scheme, box_scheme
// ].map(key => 'export ' + key.ts).join('\n'))

export class Parser {
    constructor() { }

    parse(lexer: Lexer) {
        const visitor = new TreeVisitor(lexer)
        box_scheme.eat(lexer, scheme).accept(visitor)
    }
}