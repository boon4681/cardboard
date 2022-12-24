import chalk from "chalk"

export type Location = {
    line: number
    column: number
}

export type Range = [number, number]

export type Span = {
    start: Location
    end: Location
    range: Range
    size: number
}

export interface Config { }

export class Token {
    name: string
    raw: string
    span: Span

    constructor(name: string, raw: string, span: Span) {
        this.name = name
        this.raw = raw
        this.span = span
    }
}

export class Input {
    index: number = 0
    line: number = 1
    column: number = 0
    size: number

    line_index: number = 0

    last_index: number = 0

    constructor(public name: string, public input: string, public config?: Config) {
        this.size = input.length
    }

    private validate_move(step: number) {
        const value = this.index + step
        if (value < 0) {
            throw new Error(`index must be more than one. [0,${this.size}] ${value}`)
        }
        if (value > this.size) {
            throw new Error(`index must be lower than input size. [0,${this.size}] ${value}`)
        }
        return true
    }

    private clamp(step: number) {
        const value = this.index + step
        if (value < 0) {
            return 0
        }
        if (value > this.size) {
            return this.size
        }
        return value
    }

    private update_line(step: number) {
        const m = /\n/g.exec(this.pan(step, true))
        this.column += step
        if (m) {
            if (step >= 0) {
                this.line += m.length
            } else {
                this.line -= m.length
            }
            this.line_index = this.index
            this.column = 0
        }
    }

    wreak_havoc(i?: { result?: boolean, err?: Error }) {
        if (i) {
            if (this.last_index === this.index && !this.eof() && !i.result) {
                if (i && i.err) {
                    throw i.err
                }
                throw new Error("A havoc was happened somewhere in cardboard")
            }
        } else {
            if (this.last_index === this.index && !this.eof()) {
                throw new Error("A havoc was happened somewhere in cardboard")
            }
        }
        this.last_index = this.index
    }

    get(index: number, clamp?: boolean) {
        if (clamp) {
            return this.input[this.clamp(index)]
        }
        this.validate_move(index)
        return this.input[this.index + index]
    }

    move(step: number) {
        this.validate_move(step)
        return this.index + step
    }

    seek(step: number, clamp?: boolean) {
        if (clamp) {
            this.last_index = this.index + 0
            const result = this.input.slice(this.index, this.index = this.clamp(step))
            this.update_line(step)
            return result
        }
        this.validate_move(step)
        this.last_index = this.index + 0
        const result = this.input.slice(this.index, this.index += step)
        this.update_line(step)
        return result
    }

    pan(range: number | Range, clamp?: boolean) {
        let value = [0, 0]
        if (typeof range == 'number') {
            if (range > 0) {
                value[1] = range
            } else {
                value[0] = range
            }
        } else {
            value[0] = range[0]
            value[1] = range[1]
        }
        if (clamp) {
            return this.input.slice(this.clamp(value[0]), this.clamp(value[1]))
        }
        this.validate_move(value[0])
        this.validate_move(value[1])
        value[0] += this.index - 1
        value[1] += this.index - 1
        return this.input.slice(value[0], value[1])
    }

    to_end() {
        return this.input.slice(this.index)
    }

    code(step: number) {
        return this.input.charCodeAt(this.index + step)
    }

    eof() {
        return this.index == this.size
    }

    eol() {
        return this.code(0) === '\n'.charCodeAt(0) || this.eof()
    }

    skip() {
        this.index += 1
    }

    skip_char(char: string) {
        if (char.charCodeAt(0) == this.code(0)) {
            this.skip()
        }
    }

    skip_until_not(char: string) {
        while (char.charCodeAt(0) == this.code(0)) {
            this.skip()
        }
    }
}

export class DepthDebug {
    depth: number = 0
    wrapper_stack: Wrapper[] = []
    wrapper_queue: Wrapper[] = []
    log(...args: any) {
        console.log(new Array(this.depth).fill('  ').join('') + args[0], ...[...args].slice(1))
    }
    push() {
        this.depth += 1
    }
    pop() {
        this.depth -= 1
    }
}

export class Wrapper {

    stack: Reader[] = []
    wrapper_stack: Wrapper[] = []
    wrapper_queue: Wrapper[] = []
    parent!: Wrapper

    constructor(public source: Input, public name: string, public depthDebug: DepthDebug) { }

    add_wrapper(wrapper: Wrapper) {
        wrapper.parent = this
        wrapper.depthDebug = this.depthDebug
        wrapper.source = this.source
        this.wrapper_stack.push(wrapper)
        return this
    }

    read(): Token[] | void {
        const tokens: Token[] = []
        this.depthDebug.log(`@start --------> ${this.name}`)
        this.depthDebug.push()
        for (const lexer of this.stack) {
            this.depthDebug.log(`@stack ${this.name}:${lexer.name}`, lexer.test())
            if (lexer.test()) {
                if (!lexer.options.fragment) {
                    const result = lexer.read()
                    if (!lexer.options.ignored) {
                        if (lexer.options.mode == "push") {
                            if (lexer.options.wrapper === 'self') {
                                this.wrapper_queue.unshift(this)
                            } else {
                                lexer.options.wrapper.parent = this
                                lexer.options.wrapper.depthDebug = this.depthDebug
                                this.wrapper_queue.unshift(lexer.options.wrapper)
                            }
                        }
                        if (lexer.options.mode == "pop") {
                            this.depthDebug.log(`@pop ${this.name}:${lexer.name}`)
                            this.parent.wrapper_queue.shift()
                        }
                        tokens.push(result)
                    }
                }
            } else {
                this.source.wreak_havoc()
            }
        }
        this.depthDebug.log('@list', this.name, this.wrapper_stack.map(a => a.name))
        for (const wrapper of this.wrapper_stack) {
            const test = wrapper.test()
            this.depthDebug.log(`test from ${this.name}:${wrapper.name}`, test)
            if (test) {
                const result = wrapper.read()
                // this.depthDebug.log(this.name, 'result', result)
                if (result) {
                    tokens.push(...result)
                }
            }
        }
        while (this.wrapper_queue.length > 0) {
            const wrapper = this.wrapper_queue[0]
            this.depthDebug.log(chalk.green(wrapper.name))
            const result = wrapper.read()
            if (result && result.length > 0) {
                this.depthDebug.log(`${this.name}:${wrapper.name}`, result.length)
                tokens.push(...result)
            }
            else {
                throw new Error('No viable alternative')
            }
            // console.log(this.source.pan(10,true))
        }
        this.depthDebug.pop()
        this.depthDebug.log(`@end --------> ${this.name}`)
        return tokens
    }

    test() {
        const index = this.source.index + 0
        const last_index = this.source.last_index + 0
        if (this.stack.length == 0) return false
        for (const lexer of this.stack) {
            if (
                lexer.test()
            ) {
                if (!lexer.options.fragment) {
                    lexer.read()
                }
            } else {
                this.source.index = index
                this.source.last_index = last_index
                return false
            }
        }
        this.source.index = index
        this.source.last_index = last_index
        return true
    }

    cwrap(callback: (wrap: (reader: Reader | Wrapper) => void) => void) {
        const self = this
        function wrap(reader: Reader | Wrapper) {
            if (reader instanceof Reader) {
                reader.parent = self
                reader.source = self.source
                reader.compile()
                self.stack.push(reader)
            } else {
                console.log(`add ${reader.name} to ${self.name}`)
                reader.parent = self
                reader.depthDebug = self.depthDebug
                reader.source = self.source
                self.wrapper_stack.push(reader)
            }
        }
        callback(wrap)
    }
}

export type ReaderOptions = {
    mode: "pop"
    fragment?: boolean,
    ignored?: boolean
} | {
    mode: "push"
    wrapper: Wrapper | 'self'
    fragment?: boolean,
    ignored?: boolean
} | {
    mode: "normal"
    fragment?: boolean,
    ignored?: boolean
}

export class Reader {

    name: string
    regex: RegExp
    parent!: Wrapper
    source!: Input
    options: ReaderOptions = { mode: 'normal', fragment: false, ignored: false }

    constructor({ name, regex }: { name: string, regex: RegExp }, options?: ReaderOptions) {
        this.name = name
        this.regex = regex
        if (options) {
            this.options = options
        }
    }

    fragment() {
        this.options.fragment = true
        return this
    }

    ignore() {
        this.options.ignored = true
        return this
    }

    clone(setting?: { name?: string }, options?: ReaderOptions) {
        let _ = Object.assign(this, setting ? setting : {})
        if (options) {
            _.options = options
        }
        return _
    }

    compile() {
        let reg = this.regex.source
        if (/\\f\{([A-Za-z0-9]+)\}/g.test(reg)) {
            for (const i of reg.matchAll(/\\f\{([A-Za-z0-9]+)\}/g)) {
                if (i[1] == 'Any') {
                    reg = reg.replace(/\\f\{([A-Za-z0-9]+)\}/, '\[\\s\\S\]')
                    continue
                }
                const m = this.parent.stack.filter(a => a.name == i[1] && a.options.fragment)
                if (m.length > 0) {
                    reg = reg.replace(/\\f\{([A-Za-z0-9]+)\}/, m[0].regex.source)
                } else {
                    throw new Error(`Not Found TokenReader named ${i[1]}\n${JSON.stringify({
                        name: this.name,
                        regex: this.regex,
                        fragment: this.options.fragment
                    }, null, 4)}`)
                }
            }
            this.regex = new RegExp(reg)
        }
    }

    test() {
        const m = this.regex.exec(this.source.to_end())
        return m ? m.index === 0 : false
    }

    match() {
        return this.test() && this.regex.exec(this.source.to_end())
    }

    read() {
        const match = this.match()
        const start_line = this.source.line + 0
        const start_col = this.source.column + 0
        if (match) {
            const start = this.source.index
            const end = start + match[0].length + 0
            const value = this.source.seek(match[0].length)
            return new Token(this.name, value, {
                start: {
                    line: start_line,
                    column: start_col
                },
                end: {
                    line: this.source.line,
                    column: this.source.column
                },
                range: [start, end],
                size: value.length
            })
        }
        throw new Error(`${this.source.name}:${start_line}:${start_col}\n${this.source.pan([-100, 0], true)} <- missing ${this.regex}`)
    }
}

export class LiteralReader extends Reader {
    constructor() {
        super({ name: 'literal', regex: /./ })
    }
    set_token(token: string) {
        this.regex = new RegExp(token)
    }
}

export type CommandNode = {
    type: "literal" | "root"
    parser?: string
    properties?: { [key: string]: any }
    redirect?: string[]
    executable?: boolean
    children?: {
        [key: string]: CommandNode
    }
} | {
    type: "argument"
    parser: string
    properties: { [key: string]: any }
    redirect?: string[]
    executable?: boolean
    children?: {
        [key: string]: CommandNode
    }
}

export type TreeNode = {
    name: string
    type: "literal" | "argument" | "root"
    parser?: string
    properties?: { [key: string]: any }
    redirect?: string[]
    executable?: boolean
    children?: {
        [key: string]: CommandNode
    }
}

export class Command {
    constructor(public root: CommandNode) { }

    unwrap(node: CommandNode): TreeNode[] | null {
        if (node.children) {
            const nodes = node.children
            return Object.keys(nodes).map(a => {
                return { name: a, ...nodes[a] }
            })
        }
        return null
    }
}

export class Lexer {
    constructor(public source: Input, public commands: CommandNode) { }

    read() {
        const { unwrap } = new Command(this.commands)
        let tree = unwrap(this.commands)
        const literal_reader = new LiteralReader()
        literal_reader.source = this.source
        while (tree) {
            if (tree) {
                for (const node of tree) {
                    if (node.type === 'literal') {
                        literal_reader.set_token(node.name)
                        if (literal_reader.test()) {
                            console.log(literal_reader.read())
                            tree = unwrap(node as any)
                            this.source.skip_until_not(" ")
                        }
                    }
                    if (node.type === 'argument') {
                        console.log(node.parser)
                    }
                }
                this.source.wreak_havoc()
            }
        }
    }
}