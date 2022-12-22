
export type Location = {
    line: number
    column: number
}

export type Range = [number, number]

export type Span = {
    start: Location,
    end: Location,
    range: Range
}

export interface Config { }

export class Token {
    value: string
    span: Span

    constructor(value: string, span: Span) {
        this.value = value
        this.span = span
    }
}

export class Input {
    index: number = 0
    line: number = 1
    column: number = 0
    size: number

    private last_index: number = 0

    constructor(public input: string, public config?: Config) {
        if (input.length > 0) {
            this.size = input.length - 1
        } else {
            this.size = input.length
        }
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
            return -value
        }
        if (value > this.size) {
            return value - this.size
        }
        return value
    }

    private update_line(step: number) {
        const m = /\n/g.exec(this.pan(step))
        this.column += step
        if (m) {
            if (step >= 0) {
                this.line += m.length
            } else {
                this.line -= m.length
            }
            this.column = 0
        }
    }

    make_havoc() {
        if (this.last_index === this.index && !this.eof()) {
            throw new Error("A havoc was happened somewhere in cardboard")
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
        value[0] += this.index -1
        value[1] += this.index -1
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

export class Wrapper {

    stack: Reader[] = []
    wrapper_stack: Wrapper[] = []
    parent!: Lexer

    constructor(public source: Input, public name: string) { }

    test() {
        for (const node of this.stack) {
            if (node.test() && !node._fragment) {
                if (node.options.mode == "push") {
                    if (node.options.wrapper === 'self') {
                        this.wrapper_stack.unshift(this)
                    } else {
                        node.options.wrapper.parent = this.parent
                        this.wrapper_stack.unshift(node.options.wrapper)
                    }
                }
                if (node.options.mode == "pop") {
                    this.wrapper_stack.shift()
                }
                return node
            }
        }
        return undefined
    }

    cwrap(callback: (wrap: (reader: Reader) => void) => void) {
        const self = this
        function wrap(reader: Reader) {
            reader.parent = self
            reader.source = self.source
            reader.compile()
            self.stack.push(reader)
        }
        callback(wrap)
    }
}

export type ReaderOptions = {
    mode: "pop"
    fragment?: boolean
} | {
    mode: "push"
    wrapper: Wrapper | 'self'
    fragment?: boolean
} | {
    mode: "normal"
    fragment?: boolean
}

export class Reader {

    name: string
    regex: RegExp
    parent!: Wrapper
    source!: Input
    _fragment: boolean = false
    options: ReaderOptions = { mode: 'normal' }

    constructor({ name, regex }: { name: string, regex: RegExp }, options?: ReaderOptions) {
        this.name = name
        this.regex = regex
        if (options) {
            this.options = options
        }
    }

    fragment() {
        this._fragment = true
        return this
    }

    compile() {
        let reg = this.regex.source
        if (/\\f\{([A-Za-z0-9]+)\}/g.test(reg)) {
            for (const i of reg.matchAll(/\\f\{([A-Za-z0-9]+)\}/g)) {
                if (i[1] == 'Any') {
                    reg = reg.replace(/\\f\{([A-Za-z0-9]+)\}/, '\[\\s\\S\]')
                    continue
                }
                const m = this.parent.stack.filter(a => a.name == i[1] && a._fragment)
                if (m.length > 0) {
                    reg = reg.replace(/\\f\{([A-Za-z0-9]+)\}/, m[0].regex.source)
                } else {
                    throw new Error(`Not Found TokenReader named ${i[1]}\n${JSON.stringify({
                        name: this.name,
                        regex: this.regex,
                        fragment: this._fragment
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
            return new Token(value, {
                start: {
                    line: start_line,
                    column: start_col
                },
                end: {
                    line: this.source.line,
                    column: this.source.column
                },
                range: [start, end]
            })
        }
        throw new Error(`[${this.source.index}]\n${this.source.pan(-15)} <- missing ${this.regex}`)
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
                this.source.make_havoc()
            }
        }
    }
}