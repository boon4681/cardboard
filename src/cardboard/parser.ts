import { writeFileSync } from "fs"
import path from "path"
import { Group, GroupSerial, IFWrapper, Input, is_pack, LexerBase, Pack, Reader, Tokenizer, Wrapper, WrapperSerial } from "pulpboard"
import { Lexer } from "./lexer"
import { ActionModeMapper, Node, ParserScheme, Visitor } from "./parser_scheme"
import { BoxNode, ExpressionNode, GroupNode, HeaderNode, IfStatementNode, LexerDeclarationNode, WrapperNode } from "./type"

const header_scheme = new ParserScheme('Header',
    `
header
`
)

const lexer_scheme = new ParserScheme('LexerDeclaration',
    `
@decorator(
    @bind[
        lexer.bind -> ignore
        lexer.bind.punctuation.open -> ignore
        lexer.bind.name
        lexer.bind.punctuation.close -> ignore
    ]?
    @merge[
        lexer.merge
    ]?
)*
lexer.keyword -> $keyword
lexer.name -> $name
lexer.block.open -> ignore
@children(
    !lexer.merge -> #LexerDeclaration
    !lexer.bind -> #LexerDeclaration
    !lexer.keyword -> #LexerDeclaration
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
        identifier -> $argument
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
strings -> $condition
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
        !lexer.merge -> #LexerDeclaration
        !lexer.bind -> #LexerDeclaration
        !lexer.keyword -> #LexerDeclaration
    )*
    `
)

class TreeVisitor implements Visitor {
    constructor(
        public lexer: Lexer
    ) { }

    name(name: string[], parent: boolean = false): string {
        if (parent) {
            const parent = this.stack[this.stack.length - 1]
            if (is_pack(parent)) {
                return [parent.name].concat(name).join('.')
            } else {
                throw new Error('Not Found Parent: name in cardboard')
            }
        }
        return name.join('.')
    }

    global: { [k: string]: Tokenizer } = {}
    local: { [k: string]: Tokenizer }[] = []
    stack: Tokenizer[] = []
    private pointer = 0

    visitBox(node: BoxNode) {
        // console.log(node.acceptChildren(this))
        const children = node.acceptChildren(this)
        // console.log((children as any)[0].children[0].children[0])
        return children
    }
    visitHeader(node: HeaderNode) {

    }
    visitLexerDeclaration(node: LexerDeclarationNode) {
        const name = node.name.value!
        const lexer = new Wrapper(name)
        if (name in this.global && name in this.local) {
            throw new Error('Overloading in cardboard is not allowed.' + '\n')
        }
        this.stack.push(lexer)
        this.local.push({})
        this.pointer++
        lexer.add(node.acceptChildren(this))
        if (this.stack.length == 1) {
            this.global[name] = lexer
            this.pointer--
            if (node.decorator) {
                if (node.decorator.merge) {
                    lexer.merging = true
                }
                if (node.decorator.bind) {
                    return this.stack.pop()
                }
            }
            this.stack.pop()
        } else {
            this.pointer--
            this.local[this.pointer][name] = lexer
            this.stack.pop()
        }
    }
    visitExpression(node: ExpressionNode) {
        const expr = new Wrapper(node.name.value!)
        expr.add(node.acceptChildren(this))
        expr.merging = true
        if (node.action) {
            switch (node.action.name.value) {
                case 'pop':
                    if (node.action.argument?.value) {
                        throw new Error(`HI`)
                    }
                    expr.set({ mode: 'pop', ignore: false, nullable: false })
                    break
                case 'push':
                    expr.set({ mode: 'push', ignore: false, nullable: false, tokenizer: this.local[this.pointer][node.action.argument!.argument!.value!] })
                    break
                default:
                    throw new Error(`Unknown action: ${node.action.name.value}`)
            }
        }
        return expr
    }
    visitStrings(node: Node) {
        const parent = this.stack[this.stack.length - 1] as Pack
        try {
            return new Reader(
                this.name([parent.children.length.toString()], true),
                new RegExp(node.value?.slice(1, -1)!)
            )
        } catch (error: any) {
            throw new Error(error.message + '\n')
        }
    }
    visitIfStatement(node: IfStatementNode) {
        const parent = this.stack[this.stack.length - 1] as Pack
        const if_statement = new IFWrapper(this.name(['if', parent.children.length.toString()], true), this.visitStrings(node.condition))
        if (node.stop) {
            if_statement.stop(true)
        }
        this.stack.push(if_statement)
        if_statement.add(node.acceptChildren(this))
        return this.stack.pop()
    }
    visitWrapper(node: WrapperNode) {
        const parent = this.stack[this.stack.length - 1] as Pack
        const mode = ActionModeMapper[node.mode.value!]
        let wrapper: Pack
        switch (mode) {
            case 'once':
                wrapper = new Wrapper(this.name(['wrapper', parent.children.length.toString()], true))
                break
            case 'null or once':
                wrapper = new Wrapper(this.name(['wrapper', parent.children.length.toString()], true))
                wrapper.set({ mode: 'normal', ignore: false, fragment: false, nullable: true })
                break;
            case 'repeat':
                wrapper = new WrapperSerial(this.name(['wrapper', parent.children.length.toString()], true))
                break
            case 'null or repeat':
                wrapper = new WrapperSerial(this.name(['wrapper', parent.children.length.toString()], true))
                wrapper.set({ mode: 'normal', ignore: false, fragment: false, nullable: true })
                break
            default:
                throw new Error(`Mode Not Found: ${mode}:${node.mode.value}`)
        }
        this.stack.push(wrapper)
        wrapper.add(node.acceptChildren(this))
        return this.stack.pop()
    }
    visitGroup(node: GroupNode) {
        const parent = this.stack[this.stack.length - 1] as Pack
        const mode = ActionModeMapper[node.mode.value!]
        let group: Pack
        switch (mode) {
            case 'once':
                group = new Group(this.name(['group', parent.children.length.toString()], true))
                break
            case 'null or once':
                group = new Group(this.name(['group', parent.children.length.toString()], true))
                group.set({ mode: 'normal', ignore: false, fragment: false, nullable: true })
                break;
            case 'repeat':
                group = new GroupSerial(this.name(['group', parent.children.length.toString()], true))
                break
            case 'null or repeat':
                group = new GroupSerial(this.name(['group', parent.children.length.toString()], true))
                group.set({ mode: 'normal', ignore: false, fragment: false, nullable: true })
                break
            default:
                throw new Error(`Mode Not Found: ${mode}:${node.mode.value}`)
        }
        this.stack.push(group)
        group.add(node.acceptChildren(this))
        return this.stack.pop()
    }
    visitLexerName(node: Node) { }
    visitCardboardMetadata(node: Node) { }
}

const scheme = {
    'Header': header_scheme,
    'LexerDeclaration': lexer_scheme,
    'Expression': expr_scheme,
    'IfStatement': if_scheme,
    'Group': group_scheme,
    'Wrapper': wrapper_scheme,
}

// writeFileSync(path.join(__dirname, 'type.ts'), 'import { Node } from "./parser_scheme";\n' + [
//     header_scheme, lexer_scheme, expr_scheme, if_scheme, group_scheme, wrapper_scheme, box_scheme,
// ].map(key => 'export ' + key.ts).join('\n'))

export class TestLexer extends LexerBase {
    constructor() {
        super(new Input('', ''), [])
    }
    disable_debugger: boolean = true;
}

export class Parser {
    constructor() { }

    parse(lexer: Lexer) {
        const visitor = new TreeVisitor(lexer)
        const node = box_scheme.eat(lexer, scheme)
        // console.log(JSON.stringify(node))
        const cardboard = new TestLexer()
        cardboard.scheme = node.accept(visitor)
        return cardboard
    }
}