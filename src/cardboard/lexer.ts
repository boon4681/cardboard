import chalk from "chalk"
import { readFileSync } from "node:fs"

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

export type TokenizerOptions = {
    mode: "pop"
    fragment?: boolean,
    ignored?: boolean
} | {
    mode: "push"
    reader: Tokenizer | 'self'
    fragment?: boolean,
    ignored?: boolean
} | {
    mode: "normal"
    fragment?: boolean,
    ignored?: boolean,
    nullable?: boolean
}

export type TokenizerType = "reader" | "group" | "wrapper" | "if-wrapper"

export interface Tokenizer {
    name: string
    type: TokenizerType
    parent: Tokenizer | null
    source: Input
    options: TokenizerOptions
    read(): Token | Token[] | undefined
    test(): boolean
    is_nullable(): boolean
}

export class Reader implements Tokenizer {
    name: string
    regex: RegExp
    type: TokenizerType = "reader"
    parent!: Wrapper
    source!: Input
    options: TokenizerOptions = { mode: 'normal', fragment: false, ignored: false, nullable: false }

    constructor(name: string, regex: RegExp, options?: TokenizerOptions) {
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

    is_nullable() {
        if (this.options.mode == "normal") {
            if (this.options.nullable) {
                return true
            }
        }
        return false
    }

    clone(setting?: { name?: string }, options?: TokenizerOptions) {
        let _ = Object.assign(this, setting ? setting : {})
        if (options) {
            _.options = options
        }
        return _
    }

    test() {
        console.log('@reader', this.name)
        const m = this.regex.exec(this.source.to_end())
        return m ? m.index === 0 : false
    }

    match() {
        return this.test() && this.regex.exec(this.source.to_end())
    }

    read(): Token | undefined {
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
        if (this.is_nullable()) {
            return undefined
        }
        throw new Error(`${this.source.name}:${start_line}:${start_col}\n${this.source.pan([-100, 0], true)} <- missing ${this.regex}`)
    }
}

export class Group implements Tokenizer {
    name: string
    type: TokenizerType = "group"
    parent!: Wrapper
    source!: Input
    stack: Tokenizer[] = []
    options: TokenizerOptions = { mode: 'normal', fragment: false, ignored: false, nullable: false }

    constructor(name: string, source: Input, options?: TokenizerOptions) {
        this.name = name
        this.source = source
        if (options) {
            this.options = options
        }
    }

    is_nullable() {
        if (this.options.mode == "normal") {
            if (this.options.nullable) {
                return true
            }
        }
        return false
    }

    group(callback: (wrap: (reader: Tokenizer) => void) => void) {
        const self = this
        function wrap(reader: Tokenizer) {
            if (reader instanceof Reader) {
                reader.parent = self.parent
                reader.source = self.source
                self.stack.push(reader)
            } else {
                reader.parent = self.parent
                reader.source = self.source
                self.stack.push(reader)
            }
        }
        callback(wrap)
        return this
    }

    read(): Token[] | undefined {
        for (const reader of this.stack) {
            if (reader.test()) {
                if (!reader.options.fragment) {
                    if (reader.type == "reader") {
                        const result = reader.read()
                        if (result) {
                            if (reader.options.mode == "push") {
                                if (reader.options.reader === 'self') {
                                    this.parent.queue.unshift(this)
                                } else {
                                    reader.options.reader.parent = this
                                    this.parent.queue.unshift(reader.options.reader)
                                }
                            }
                            if (reader.options.mode == "pop") {
                                this.parent.parent.queue.shift()
                            }
                        } else if (reader.is_nullable()) {
                            return undefined
                        }
                        if (reader.options.ignored) {
                            return undefined
                        } else {
                            return [result as Token]
                        }
                    }
                    if (reader.type == "group") {
                        const result = reader.read()
                        if (!result && reader.is_nullable()) {
                            return undefined
                        }
                        if (reader.options.ignored) {
                            return undefined
                        } else {
                            return [...result as Token[]]
                        }
                    }
                    if (reader.type == "wrapper") {
                        const result = reader.read()
                        if (result) {
                            if (reader.options.mode == "push") {
                                if (reader.options.reader === 'self') {
                                    this.parent.queue.unshift(this)
                                } else {
                                    reader.options.reader.parent = this
                                    this.parent.queue.unshift(reader.options.reader)
                                }
                            }
                            if (reader.options.mode == "pop") {
                                this.parent.parent.queue.shift()
                            }
                        } else if (reader.is_nullable()) {
                            return undefined
                        }
                        if (reader.options.ignored) {
                            return undefined
                        } else {
                            return [...result as Token[]]
                        }
                    }
                    if (reader.type == "if-wrapper") {
                        const result = reader.read()
                        if (result) {
                            return [...result as Token[]]
                        }
                    }
                }
            }
        }
        return undefined
    }

    test(): boolean {
        console.log(this.name)
        for (const reader of this.stack) {
            if (reader.test()) {
                return true
            }
        }
        return false
    }
}

export class GroupContinuous extends Group {
    read(): Token[] {
        const tokens: Token[] = []
        while (this.test()) {
            const result = super.read()
            console.log(result, 'GroupContinuous')
            if (result) {
                tokens.push(...result as Token[])
            }
        }
        return tokens
    }
}

export class Wrapper implements Tokenizer {
    name: string
    type: TokenizerType = "wrapper"
    parent!: Wrapper
    source!: Input
    options: TokenizerOptions = { mode: 'normal', fragment: false, ignored: false, nullable: false }

    suggest?: Tokenizer

    stack: Tokenizer[] = []
    queue: Tokenizer[] = []


    is_nullable() {
        if (this.options.mode == "normal") {
            if (this.options.nullable) {
                return true
            }
        }
        return false
    }

    constructor(name: string, source: Input, options?: TokenizerOptions) {
        this.name = name
        this.source = source
        if (options) {
            this.options = options
        }
    }

    group(callback: (wrap: (reader: Tokenizer) => void) => void) {
        const self = this
        function wrap(reader: Tokenizer) {
            console.log(self.name, reader.name)
            if (reader instanceof Reader) {
                reader.parent = self
                reader.source = self.source
                self.stack.push(reader)
            } else {
                reader.parent = self
                console.log(reader)
                reader.source = self.source
                self.stack.push(reader)
            }
        }
        callback(wrap)
        return this
    }

    read(): Token[] {
        const tokens: Token[] = []
        for (const reader of this.stack) {
            if (reader.test()) {
                if (reader.type == "reader") {
                    const result = reader.read()
                    if (result) {
                        if (reader.options.mode == "push") {
                            if (reader.options.reader === 'self') {
                                this.queue.unshift(this)
                            } else {
                                reader.options.reader.parent = this
                                this.queue.unshift(reader.options.reader)
                            }
                        }
                        if (reader.options.mode == "pop") {
                            this.parent.queue.shift()
                        }
                        if (!reader.options.ignored) {
                            tokens.push(result as Token)
                        }
                    }
                } else if (reader.type == "group") {
                    const result = reader.read()
                    if (result) {
                        if (!reader.options.ignored) {
                            tokens.push(...result as Token[])
                        }
                    }
                } else if (reader.type == "wrapper") {
                    const result = reader.read()
                    if (result) {
                        if (reader.options.mode == "push") {
                            if (reader.options.reader === 'self') {
                                this.queue.unshift(this)
                            } else {
                                reader.options.reader.parent = this
                                this.queue.unshift(reader.options.reader)
                            }
                        }
                        if (reader.options.mode == "pop") {
                            this.parent.queue.shift()
                        }
                        if (!reader.options.ignored) {
                            tokens.push(...result as Token[])
                        }
                    }
                } else if (reader.type == "if-wrapper") {
                    const result = reader.read()
                    console.log((reader as any).queue)
                    if (result) {
                        tokens.push(...result as Token[])
                        return tokens
                    }
                }
            } else {
                console.log('error', reader.name)
                if (!reader.is_nullable() && reader.type != "if-wrapper") {
                    throw new Error(`No viable alternative.\n${chalk.red(this.source.pan(-100, true))}<- is not ${reader.name}`)
                }
            }
        }
        while (this.queue.length > 0) {
            const reader = this.queue[0]
            const result = reader.read()
            if (result) {
                tokens.push(...[result].flat(1))
            }
            else {
                throw new Error(`No viable alternative.\n${chalk.red(this.source.pan(-100, true))}<- is not ${reader.name}`)
            }
        }
        return tokens
    }

    test(): boolean {
        console.log(this.name)
        if (this.stack.length > 0) {
            let reader: Tokenizer = this.stack[0]
            let i = 0
            while (!reader.test() && reader.type == 'if-wrapper' && i < this.stack.length) {
                reader = this.stack[i]
                i++
            }
            if (reader.test()) return true
        }
        return false
    }
}

export class IFWrapper extends Wrapper {
    type: TokenizerType = "if-wrapper"

    tester: Reader

    constructor(name: string, source: Input, tester: Reader) {
        super(name, source, undefined)
        tester.source = this.source
        tester.parent = this
        this.tester = tester
    }

    test() {
        console.log(this.name)
        if (this.stack.length > 0) {
            if (this.tester.test()) return true
        }
        console.log('failed')
        return false
    }
}

export class CardboardLexer {
    stack: Wrapper[] = []
    constructor(public source: Input) {
        const Hidden = new Wrapper('hidden', source)
        const HeaderWrapper = new Wrapper('header', source)
        const LexerWrapper = new Wrapper('lexer', source)
        const LexerBlock = new Wrapper('lexer.block', source)
        const ExpressionWrapper = new Wrapper('expr', source)
        const Strings = new Wrapper('strings', source)
        const QuotedString = new IFWrapper('strings.quoted', source, new Reader('strings.quoted.tester', /'/))
        const QuotedStringContext = new Wrapper('strings.quoted.context', source)
        const DoubleQuotedString = new IFWrapper('strings.double_quoted', source, new Reader('strings.double_quoted.tester', /"/))
        const DoubleQuotedStringContext = new Wrapper('strings.double_quoted.context', source)

        Hidden.group(wrap => {
            wrap(new Reader('hidden', /[\s\r\n]*/).ignore())
        })

        const hidden = new Reader('hidden', /[\s\r\n]+/).ignore()
        const whitespace = new Reader('whitespace', /[\u0020\u0009\u000C]+/).ignore()
        const Whitespace = new Reader('whitespace', /[\u0020\u0009\u000C]*/).ignore()
        const identifier = new Reader('identifier', /[_\w][_\w\d]*/)
        HeaderWrapper.group(wrap => {
            wrap(new Reader('hashtag', /#/))
            wrap(new Reader('content', /[^\r\n]*/))
        })

        QuotedStringContext.group(wrap => {
            const Context = new GroupContinuous('context', source, { mode: 'normal', nullable: true })
            Context.group(wrap => {
                wrap(new Reader('text', /[^\\\'\r\n]+/, { mode: 'normal', nullable: true }))
                wrap(new Reader('escape', /\\[tbrn\'\"\\]/, { mode: 'normal', nullable: true }))
            })
            wrap(Context)
            wrap(new Reader('strings.quoted.close', /\'/, {
                mode: 'pop'
            }))
        })

        QuotedString.group(wrap => {
            wrap(new Reader('strings.quoted.open', /\'/, {
                mode: 'push',
                reader: QuotedStringContext
            }))
        })

        DoubleQuotedStringContext.group(wrap => {
            const Context = new GroupContinuous('context', source, { mode: 'normal', nullable: true })
            wrap(Context)
            Context.group(wrap => {
                wrap(new Reader('text', /[^\\\"\r\n]+/, { mode: 'normal', nullable: true }))
                wrap(new Reader('escape', /\\[tbrn\"\'\\]/, { mode: 'normal', nullable: true }))
            })
            wrap(new Reader('strings.double_quoted.close', /\"/, {
                mode: 'pop'
            }))
        })

        DoubleQuotedString.group(wrap => {
            wrap(new Reader('strings.double_quoted.open', /\"/, {
                mode: 'push',
                reader: DoubleQuotedStringContext
            }))
        })

        Strings.group(wrap => {
            wrap(QuotedString)
            wrap(DoubleQuotedString)
        })

        ExpressionWrapper.group(wrap => {
            const ReaderValue = new Wrapper('reader.value', source)
            const ReaderOptions = new Wrapper('reader.options', source, { mode: 'normal', nullable: true })
            wrap(identifier.clone({ name: 'reader.name' }))
            wrap(Whitespace)
            wrap(new Reader('reader.assign', /=/))
            wrap(Whitespace)
            wrap(ReaderValue)
            wrap(ReaderOptions)
            ReaderValue.group(wrap => {
                const ContinuousWrapper = new GroupContinuous('reader.value', source, { mode: 'normal', nullable: true })
                const Context = new Group('reader.value', source)
                Context.group(wrap => {
                    wrap(Strings)
                    wrap(identifier.clone({ name: 'expr.lexer.name' }))
                    wrap(new Reader('cardboard.metadata',/\@(?:[_\w][_\w\d]*)(?:\.(?:[_\w][_\w\d]*))*/))
                })
                ContinuousWrapper.group(wrap => {
                    wrap(whitespace)
                    wrap(Context)
                })
                wrap(Context)
                wrap(ContinuousWrapper)
            })
            ReaderOptions.group(wrap => {
                const Option = new Group('reader.option',source)
                const ContinuouOption = new GroupContinuous('reader.option',source)
                const Normal = new Wrapper('reader.options.normal',source)
                const Pop = new Wrapper('reader.options.pop',source)
                const Push = new Wrapper('reader.options.push',source)
                Normal.group(wrap=>{
                    wrap(new Reader('reader.options.type',/normal/))
                })
                Pop.group(wrap=>{
                    wrap(new Reader('reader.options.type',/pop/))
                })
                Option.group(wrap=>{
                    wrap(Normal)
                    wrap(Pop)
                })
                wrap(new Reader('reader.options', /\-\>/))
                wrap(Whitespace)
                wrap(Option)
            })
        })

        LexerWrapper.group(wrap => {
            wrap(new Reader('lexer.keyword', /lexer/))
            wrap(hidden)
            wrap(identifier.clone({ name: 'lexer.name' }))
            wrap(Hidden)
            wrap(new Reader('lexer.punctuation.wrapper.block.open', /\{/, {
                mode: 'push',
                reader: LexerBlock
            }))
        })

        LexerBlock.group(wrap => {
            const LexerBlockContent = new Group('lexer.block.content', source)
            wrap(Hidden)
            wrap(LexerBlockContent)
            LexerBlockContent.group(wrap => {
                wrap(new Reader('lexer.punctuation.wrapper.block.close', /\}/, {
                    mode: 'pop'
                }))
                wrap(LexerWrapper)
                wrap(ExpressionWrapper)
            })
            wrap(Hidden)
        })

        this.wrap(Hidden)
        this.wrap(HeaderWrapper)
        this.wrap(LexerWrapper)
    }

    wrap(wrapper: Wrapper) {
        this.stack.push(wrapper)
    }

    read() {
        const tokens: Token[] = []
        while (!this.source.eof()) {
            for (const wrapper of this.stack) {
                const test = wrapper.test()
                if (test) {
                    const result = wrapper.read()
                    if (result) {
                        tokens.push(...result)
                    }
                }
            }
            this.source.wreak_havoc({
                err: new Error(`No viable alternative.\n${chalk.red(this.source.pan(-100, true))}<- no lexer`)
            })
        }
        console.log(tokens)
    }
}

export class Cardboard {
    // async load(version: string) {
    //     if (await versions_validator(version)) {

    //     }
    //     throw new Error(`Cardboard: not found minecraft:${version} version`)
    // }

    constructor() {
        const raw = readFileSync('./grammar/lexer.mccb', 'utf8')
        const input = new Input('./grammar/lexer.mccb', raw)
        try {
            new CardboardLexer(input).read()
        } catch (error: any) {
            console.log(chalk.bgRed.rgb(255, 255, 255)(" ERROR "), error.message)
            console.log(error)
        }
    }
}