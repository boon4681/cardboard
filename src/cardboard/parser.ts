import { Lexer } from "./lexer"
import { ParserScheme } from "./parser_scheme"

const header_scheme = new ParserScheme('Header',
    `
header
`
)

const wrapper_scheme = new ParserScheme('WrapperDeclaration',
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
    !lexer -> #WrapperDeclaration
    !expr -> #Expression
    !if -> #IfStatement
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
`
)

const box_scheme = new ParserScheme('Box',
    `
    header -> #Header
    header -> #Header
    (
        !lexer -> #WrapperDeclaration
    )*
    `
)

export class Parser {
    constructor() { }

    parse(lexer: Lexer) {
        const scheme = {
            'Header': header_scheme,
            'WrapperDeclaration': wrapper_scheme,
            'Expression': expr_scheme,
            'IfStatement': if_scheme
        }
        console.log(
            JSON.stringify(
                box_scheme.eat(lexer, scheme)
            )
        )
    }
}