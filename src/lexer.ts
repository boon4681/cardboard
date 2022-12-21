
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
    line: number = 0
    column: number = 0

    size: number

    constructor(public input: string, public config: Config) {
        if (input.length > 0) {
            this.size = input.length - 1
        } else {
            this.size = input.length
        }
    }

    private validate_move(step: number) {
        const value = this.index + step
        if (value < 0) {
            throw new Error(`Cursor must be more than one. [0,${this.size}] ${value}`)
        }
        if (value > this.size) {
            throw new Error(`Cursor must be lower than input size. [0,${this.size}] ${value}`)
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

    private update_line() {
        this.line++
        this.column = 0
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
            if (this.eol()) this.update_line()
            return this.input.slice(this.index, this.index = this.clamp(step))
        }
        this.validate_move(step)
        if (this.eol()) this.update_line()
        return this.input.slice(this.index, this.index += step)
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
        value[0] += this.index
        value[1] += this.index
        this.validate_move(value[0])
        this.validate_move(value[1])
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
        return this.code(0) === '\n'.charCodeAt(0)
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
    parent!: Lexer

    constructor(private source: Input, public name: string) { }

    wrap(reader: Reader) {
        reader.parent = this
        reader.source = this.source
        reader.compile()
        this.stack.push(reader)
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
        if (/\\f\{([A-Z0-9]+)\}/.test(reg)) {
            for (const i of reg.matchAll(/\\f\{([A-Z0-9]+)\}/g)) {
                if (i[1] == 'Any') {
                    reg = reg.replace(/\\f\{([A-Z0-9]+)\}/, '\[\\s\\S\]')
                    continue
                }
                const m = this.parent.stack.filter(a => a.name == i[1] && a._fragment)
                if (m.length > 0) {
                    reg = reg.replace(/\\f\{([A-Z0-9]+)\}/, m[0].regex.source)
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
            const end = start + match[0].length - 0
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

export type TreeNode = {
    type: "literal" | "argument" | "root"
    parser?: string
    properties?: { [key: string]: any },
    redirect?: string[],
    executable?: boolean
    children?: {
        [key: string]: TreeNode
    }
}

export class Lexer {
    constructor(public source: Input) { }
}