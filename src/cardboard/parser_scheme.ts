import { GroupSerial, IFWrapper, Input, LexerBase, Reader, Span, Token, Wrapper } from "pulpboard"
import { Lexer } from "./lexer"

export interface Node {
    type: string
    span: Span | undefined
    children: Node[]
}

export class Node implements Node {
    type: string;
    value: string | undefined;
    children: Node[]
    span: Span | undefined;
    attr?: string
    private visitor?: string

    constructor(
        type: string,
        children: Node[] = [],
    ) {
        this.type = type;
        this.children = children;
    }

    /**
     * Unsafe Function
     */
    accept(visitor: Visitor) {
        const cast = (visitor as unknown as { [k: string]: Function })
        if (!this.visitor) {
            this.visitor = 'visit' + this.type.split('.').map(a => a.slice(0, 1).toUpperCase() + a.slice(1)).join('')
        }
        if (cast[this.visitor]) {
            return cast[this.visitor].call(visitor, this)
        } else {
            throw new Error('Unknown ' + this.visitor)
        }
    }

    /**
     * Unsafe Function
     */
    acceptChildren(visitor: Visitor, accept_ignore: boolean = false) {
        const cast = (visitor as unknown as { [k: string]: Function })
        const result = []
        for (const node of this.children) {
            if (!node.visitor) {
                node.visitor = 'visit' + node.type.split('.').map(a => a.slice(0, 1).toUpperCase() + a.slice(1)).join('')
            }
            if (cast[node.visitor]) {
                const r = cast[node.visitor].call(visitor, node)
                if (r) {
                    result.push(r)
                }
                else if (!r && accept_ignore == true) {
                    result.push(undefined)
                }
            } else {
                throw new Error('Unknown ' + node.visitor)
            }
        }
        return result
    }
}

// export interface LnAction {
//     type: 'LnAction'
//     name: string
//     action: string
// }

// export interface GpAction {
//     type: 'GpAction'
//     action: 'once' | 'repeat' | 'null or repeat'
//     children: LnAction[]
// }

// export type Action = LnAction | GpAction

export enum _Status_ {
    succeed,
    fail,
    unprocess
}

export type Status = keyof typeof _Status_;

class parser_grammar_lexer extends LexerBase {
    constructor(source: Input) {
        const hidden = new Reader('hidden', /[\s\r\n]*/).set({ mode: 'normal', ignore: true, fragment: false, nullable: false })
        const Hidden = new Reader('hidden', /[\s\r\n]+/).set({ mode: 'normal', ignore: true, fragment: false, nullable: false })
        const group = new Wrapper('group')
        const group_children = new Wrapper('group.children')

        const wrapper = new Wrapper('wrapper')
        const wrapper_children = new Wrapper('wrapper.children')

        const normal = new Wrapper('normal')
        normal.add([
            new Reader('token', /[^\(\)\[\]\s]+/),
            new IFWrapper(
                'test.action',
                new Reader('token.action.check', /\s*\-\>/)
            ).add([
                hidden,
                new Reader('token.action.start', /\-\>/),
                hidden,
                new Reader('token.action', /[^\(\)\[\]\s]+/)
            ]),
            hidden
        ])

        wrapper.add([
            new IFWrapper(
                'test.attr',
                new Reader('attr.check', /\@\w+/)
            ).add([
                new Reader('attr.name', /\@\w+/)
            ]),
            new Reader('wrapper.children.open', /\[/).set({ mode: 'push', ignore: false, nullable: false, tokenizer: wrapper_children })
        ])

        group.add([
            new IFWrapper(
                'test.attr',
                new Reader('attr.check', /\@\w+/)
            ).add([
                new Reader('attr.name', /\@\w+/)
            ]),
            new Reader('group.children.open', /\(/).set({ mode: 'push', ignore: false, nullable: false, tokenizer: group_children })
        ])

        wrapper_children.add([
            new GroupSerial('wrapper.children').add([
                Hidden,
                group.clone(),
                wrapper.clone(),
                normal,
            ]).set({ mode: 'normal', ignore: false, fragment: false, nullable: true }),
            new Reader('wrapper.children.close', /\]([\*\+\?]?)/).set({ mode: 'pop', ignore: false, nullable: false })
        ])

        group_children.add([
            new GroupSerial('group.children').add([
                Hidden,
                group.clone(),
                wrapper.clone(),
                normal,
            ]).set({ mode: 'normal', ignore: false, fragment: false, nullable: true }),
            new Reader('group.children.close', /\)([\*\+\?]?)/).set({ mode: 'pop', ignore: false, nullable: false })
        ])

        const scheme = [
            Hidden,
            group,
            wrapper,
            normal,
        ]
        super(source, scheme)
    }
    disable_debugger: boolean = true;
}

interface TokenNode extends Node {
    name: string
    action: Node
}

interface GroupNode extends Node {
    index: number
    action: ActionMode
    ended: boolean
    status: Status
}

interface WrapperNode extends Node {
    index: number
    action: ActionMode
    ended: boolean
    status: Status
}

interface RootNode extends Node {
    index: number
    nullable: boolean
}

export type ActionMode = 'once' | 'repeat' | 'null or repeat' | 'null or once'

export const ActionModeMapper: { [k: string]: ActionMode } = {
    '': 'once',
    '?': 'null or once',
    '+': 'repeat',
    '*': 'null or repeat',
}

class parser_grammar_parser {
    ast: Node
    constructor(private lexer: parser_grammar_lexer) {
        this.ast = this.parse()
    }
    private parse() {
        const nodes: Node[] = [
            (() => {
                const x = new Node('root') as RootNode
                x.index = 0
                return x
            })()
        ]
        let node: Node = nodes[0]
        const lexer = this.lexer
        while (lexer.index < lexer.tokens.length) {
            const token = lexer.get()
            // console.log(token)
            if (token.name == 'group.children.open') {
                node = new Node('group') as GroupNode
                (node as GroupNode).index = 0;
                (node as GroupNode).status = 'unprocess';
                (node as GroupNode).ended = false;
                nodes.push(node)
            }
            else if (token.name == 'wrapper.children.open') {
                node = new Node('wrapper') as WrapperNode
                (node as WrapperNode).index = 0;
                (node as WrapperNode).status = 'unprocess';
                (node as WrapperNode).ended = false;
                nodes.push(node)
            }
            else if (token.name == 'group.children.close') {
                if (node.type == 'group') {
                    const pop = nodes.pop() as GroupNode
                    pop.action = ActionModeMapper[token.raw.slice(1)]
                    nodes[nodes.length - 1].children.push(pop)
                    node = nodes[nodes.length - 1]
                } else if (node.type == 'root') {
                    break
                } else {
                    throw new Error('FUCK')
                }
            }
            else if (token.name == 'wrapper.children.close') {
                if (node.type == 'wrapper') {
                    const pop = nodes.pop() as WrapperNode
                    pop.action = ActionModeMapper[token.raw.slice(1)]
                    nodes[nodes.length - 1].children.push(pop)
                    node = nodes[nodes.length - 1]
                } else if (node.type == 'root') {
                    break
                } else {
                    throw new Error('FUCK')
                }
            }
            else if (token.name == 'token') {
                if (['root', 'group', 'wrapper'].includes(node.type)) {
                    const _node = new Node('token') as TokenNode
                    _node.name = token.value
                    if (lexer.get(1)) {
                        if (lexer.get(1).name == 'token.action.start') {
                            lexer.next() // skip token.action.start
                            _node.action = new Node('action')
                            _node.action.value = lexer.next().value
                        } else {
                            _node.action = new Node('action')
                            _node.action.value = 'normal'
                        }
                    } else {
                        _node.action = new Node('action')
                        _node.action.value = 'normal'
                    }
                    node.children.push(_node)
                } else {
                    throw new Error('p')
                }
            }
            else if (token.name == 'attr.name') {
                if (lexer.get(1).name == 'group.children.open') {
                    node = new Node('group') as GroupNode
                    (node as GroupNode).index = 0;
                    (node as GroupNode).status = 'unprocess';
                    (node as GroupNode).ended = false;
                    nodes.push(node)
                }
                else if (lexer.get(1).name == 'wrapper.children.open') {
                    node = new Node('wrapper') as WrapperNode
                    (node as WrapperNode).index = 0;
                    (node as WrapperNode).status = 'unprocess';
                    (node as WrapperNode).ended = false;
                    nodes.push(node)
                } else {
                    throw new Error('HELLO')
                }
                node.attr = token.value.slice(1)
                lexer.next()
            }
            else {
                throw new Error('WOW')
            }
            lexer.next()
        }
        return node
    }
}

export interface Visitor { }

class tsBuilder implements Visitor {
    ts: string = ``
    constructor(
        public name: string
    ) {
        this.ts = `interface ${name + 'Node'} extends Node`
    }
    stack = 0
    visitRoot(node: RootNode) {
        this.ts += '{'
        const children = node.acceptChildren(this)
        this.ts += Array.from(new Set(children.filter(a => a.search(':') > -1))).concat(
            'children:(' + Array.from(new Set(children.filter(a => a.search(':') == -1).concat('Node'))).join('|') + ')[]'
        ).map(a => '\n    ' + a).join(';')
        this.ts += '\n}'
        return this.ts
    }
    visitWrapper(node: WrapperNode) {
        this.stack += 1
        let wrapper = ''
        if (node.attr) {
            if (node.attr != 'children') {
                wrapper += node.attr + ((node.action == 'null or once' || node.action == 'null or repeat') ? '?' : '') + ':Node'
                node.acceptChildren(this).join('|')
            }
        } else {
            wrapper += 'children:('
            wrapper += Array.from(new Set(
                node.acceptChildren(this)
                    .map(a => a.split(':')).map(a => a[0].slice(0, 1).search(/[a-z]/) == -1 ? a[0] : a[1])
                    .filter(a => a != 'Node')
            )).join('|')
            wrapper += ')[]'
        }
        this.stack -= 1
        return wrapper
    }
    visitGroup(node: GroupNode) {
        this.stack += 1
        let group = ''
        if (node.attr) {
            if (node.attr != 'children') {
                group += node.attr + ((node.action == 'null or once' || node.action == 'null or repeat') ? '?' : '') + ':Node'
                node.acceptChildren(this).join('|')
            }
        } else {
            group += Array.from(new Set(node.acceptChildren(this)
                .map(a => a.split(':')).map(a => a[0].slice(0, 1).search(/[a-z]/) == -1 ? a[0] : undefined)
                .filter(a => a != 'Node')))
                .join('|')
        }
        this.stack -= 1
        return group
    }
    visitToken(node: TokenNode) {
        if (node.action.value != 'ignore' && !node.name.startsWith('!')) {
            if (node.action.value == 'normal' && this.stack == 0) {
                if (node.name.includes('.')) {
                    return node.name.split('.').map(a => a.slice(0, 1).toUpperCase() + a.slice(1)).join('') + ':Node'
                } else {
                    return node.name + ':Node'
                }
            }
            if (node.action.value?.startsWith('$')) {
                return node.action.value.slice(1) + ':Node'
            }
            if (node.action.value?.startsWith('#')) {
                if (node.name.includes('.')) {
                    return node.name.split('.').map(a => a.slice(0, 1).toUpperCase() + a.slice(1)).join('') + ':' + node.action.value.slice(1) + 'Node'
                } else {
                    return node.name + ':' + node.action.value.slice(1) + 'Node'
                }
            }
        }
        if (node.action.value?.startsWith('#')) {
            return node.action.value.slice(1) + 'Node'
        }
    }
}

class SchemeVisitor implements Visitor {
    constructor(
        public lexer: Lexer,
        public scheme: { [k: string]: ParserScheme }
    ) { }

    stack: Node[] = []

    visitRoot(node: RootNode) {
        this.stack.push(new Node('root'))
        if (node.children.length == 0) {
            throw new Error('Root children size must be not 0')
        }
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            const result = child.accept(this);
            if (!result) {
                if (child.type == 'token') {
                    if (i >= 1) {
                        const token = this.lexer.get()
                        throw new Error(`Unexpected Token: expecting "${(child as TokenNode).name}" not "${token.name}"\n at ${this.stack.map(a => a.type).join(' > ')}`)
                    } else {
                        this.stack.pop()
                        return undefined
                    }
                } else if (!(['null or once', 'null or repeat'] as ActionMode[]).includes((child as any).action)) {
                    throw new Error(`${child} ${this.stack.map(a => a.type).join(' > ')}`)
                }
            }
        }
        return this.stack.pop()
    }

    visitWrapper(node: WrapperNode) {
        const wrapper = new Node('wrapper')
        this.stack.push(wrapper)
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            const result = child.accept(this);
            if (!result) {
                if (!(['null or once', 'null or repeat'] as ActionMode[]).includes(node.action) || i > 0) {
                    if (child.type == 'token') {
                        const token = this.lexer.get()
                        throw new Error(`Unexpected Token: expecting "${(child as TokenNode).name}" not "${token.name}"\n at ${this.stack.map(a => a.type).join(' > ')}`)
                    }
                } else {
                    this.stack.pop()
                    return undefined
                }
            }
        }
        const result = this.stack.pop()
        if (node.attr && result) {
            result.type = node.attr;
            if (node.attr == 'children') {
                (this.stack[this.stack.length - 1] as any)[node.attr] = result.children
            } else {
                (this.stack[this.stack.length - 1] as any)[node.attr] = result
            }
        } else if (result) {
            for (const node of result.children) {
                this.stack[this.stack.length - 1].children.push(node)
            }
        }
        return result
    }

    visitGroup(node: GroupNode) {
        const group = new Node('group')
        this.stack.push(group)
        let group_result: Node | undefined = undefined
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            group_result = child.accept(this);
            if (group_result) {
                break
            }
        }
        if (!group_result && !(['null or once', 'null or repeat'] as ActionMode[]).includes(node.action)) {
            throw new Error(`Cannot read ${node.type} ${this.lexer.get().value}`)
        }
        if (group_result && (['repeat', 'null or repeat'] as ActionMode[]).includes(node.action)) {
            while (group_result && this.lexer.index < this.lexer.tokens.length) {
                for (let i = 0; i < node.children.length; i++) {
                    const child = node.children[i];
                    group_result = child.accept(this);
                    if (group_result) {
                        break
                    }
                }
            }
        }
        const result = this.stack.pop()
        if (node.attr && result) {
            result.type = node.attr;
            if (node.attr == 'children') {
                (this.stack[this.stack.length - 1] as any)[node.attr] = result.children
            } else {
                (this.stack[this.stack.length - 1] as any)[node.attr] = result
            }
        } else if (result) {
            for (const node of result.children) {
                this.stack[this.stack.length - 1].children.push(node)
            }
        }
        return result
    }

    visitToken(node: TokenNode): Node | undefined {
        const token = this.lexer.get()
        const action = node.action
        if(!token){
            throw new Error(`No viable token to read.`)
        }
        if (node.name.startsWith('!')) {
            if (token.name.startsWith(node.name.slice(1))) {
                if (action.value?.startsWith('#')) {
                    const scheme_name = action.value.slice(1)
                    if (scheme_name in this.scheme) {
                        const node = this.scheme[scheme_name].ast.accept(this)
                        if (node) {
                            node.type = scheme_name
                            this.stack[this.stack.length - 1].children.push(node)
                            return node
                        }
                        return undefined
                    } else {
                        throw new Error(`Unknown scheme: ${scheme_name}`)
                    }
                }
            }
        }
        if (node.name.startsWith('?') && node.name.slice(1) != token.name) {
            if (action.value == 'normal') {
                const node = new Node('normal');
                node.value = '';
                this.stack[this.stack.length - 1].children.push(node)
                return node
            } else if (action.value == 'ignore') {
                return new Node('null')
            } else if (action.value?.startsWith('$')) {
                const node = new Node(action.value.slice(1));
                node.value = '';
                (this.stack[this.stack.length - 1] as any)[action.value.slice(1)] = node
                return node
            }
        }
        if (node.name == token.name || (node.name.startsWith('?') && node.name.slice(1) == token.name)) {
            this.lexer.index++
            if (action.value == 'normal') {
                const node = new Node(token.name);
                node.value = token.value
                node.span = token.span;
                this.stack[this.stack.length - 1].children.push(node)
                return node
            }
            else if (action.value == 'ignore') {
                return new Node('null')
            }
            else if (action.value?.startsWith('$')) {
                const node = new Node(action.value.slice(1));
                node.value = token.value;
                node.span = token.span;
                (this.stack[this.stack.length - 1] as any)[action.value.slice(1)] = node
                return node
            }
            else if (action.value?.startsWith('#')) {
                this.lexer.index--
                const scheme_name = action.value.slice(1)
                if (scheme_name in this.scheme) {
                    const node = this.scheme[scheme_name].ast.accept(this)
                    if (node) {
                        node.type = scheme_name
                        this.stack[this.stack.length - 1].children.push(node)
                        return node
                    }
                    return undefined
                } else {
                    throw new Error(`Unknown scheme: ${scheme_name}`)
                }
            }
            else {
                throw new Error(`Unknown action: ${action.value}`)
            }
        }
        return undefined
    }
}

export class ParserScheme {
    ast: Node
    ts: string

    constructor(
        public name: string,
        scheme: string
    ) {
        const lexer = new parser_grammar_lexer(new Input('cardboard.parser_scheme_dummy', scheme))
        lexer.run()
        // console.log(lexer.tokens.map(a => { return { name: a.name, value: a.value } }))
        const parser = new parser_grammar_parser(lexer)
        this.ast = parser.ast
        // console.log(JSON.stringify(this.ast))
        this.ts = this.ast.accept(new tsBuilder(this.name))
    }

    eat(lexer: Lexer, scheme: { [k: string]: ParserScheme }) {
        const visitor = new SchemeVisitor(lexer, scheme)
        const result = this.ast.accept(visitor) as Node
        result.type = this.name
        return result
    }
}