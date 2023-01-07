import chalk from "chalk"
import { Input, Token, Tokenizer, TokenizerOptions, TokenizerType } from "../lexer"
import { Reader } from "./reader"

export class Wrapper implements Tokenizer {
    name: string
    type: TokenizerType = "wrapper"
    parent!: Wrapper
    options: TokenizerOptions = { mode: 'normal', fragment: false, ignored: false, nullable: false }

    stack: Tokenizer[] = []
    queue: Tokenizer[] = []

    constructor(name: string, options?: TokenizerOptions) {
        this.name = name
        if (options) {
            this.options = options
        }
    }

    fragment(): boolean {
        return this.options.fragment || false
    }

    nullable() {
        return this.options.mode == 'normal' ? this.options.nullable || false : false
    }

    wrap(callback: (wrap: (tokenizer: Tokenizer) => void) => void) {
        const self = this
        function wrap(tokenizer: Tokenizer) {
            tokenizer.parent = self
            self.stack.push(tokenizer)
        }
        callback(wrap)
        return this
    }

    strip(tokenizer: Tokenizer) {
        let stack: string[] = []
        let tnz = tokenizer
        while (tnz.parent && tnz.name != 'lexer') {
            stack.push(tnz.name)
            tnz = tnz.parent
        }
        return stack.reverse().join(' > ')
    }

    read(source: Input): Token[] {
        const tokens: Token[] = []
        for (const tokenizer of this.stack) {
            if (tokenizer.fragment()) continue
            // if (source.stack.length == 0) 
            console.log('@wrapper', this.strip(tokenizer),tokenizer.test(source))
            if (tokenizer.test(source)) {
                const result = tokenizer.read(source)
                if (source.stack.length == 0) console.log(result)
                if (result) {
                    if (tokenizer.type == 'reader' || tokenizer.type == 'wrapper') {
                        if (tokenizer.options.mode == "push") {
                            if (tokenizer.options.tokenizer === 'self') {
                                this.queue.unshift(this)
                            } else {
                                tokenizer.options.tokenizer.parent = this
                                this.queue.unshift(tokenizer.options.tokenizer)
                            }
                        }
                        if (tokenizer.options.mode == "pop") {
                            this.parent.queue.shift()
                        }
                        if (!tokenizer.options.ignored) {
                            tokens.push(...[result].flat(1))
                        }
                        let last_queue = this.queue.length + 0
                        while (this.queue.length > 0 && this.queue.length == last_queue) {
                            const tokenizer = this.queue[0]
                            const result = tokenizer.read(source)
                            if (result) {
                                tokens.push(...[result].flat(1))
                            }
                            else {
                                throw new Error(`No viable alternative.\n${chalk.red(source.pan(-100, true))}<- is not ${tokenizer.name}`)
                            }
                        }
                    } else if (tokenizer.type == "group") {
                        if (!tokenizer.options.ignored) {
                            tokens.push(...result as Token[])
                        }
                    } else if (tokenizer.type == "if-wrapper") {
                        tokens.push(...result as Token[])
                        return tokens
                    }
                } else {
                    if (!tokenizer.nullable() && tokenizer.type != 'if-wrapper') {
                        throw new Error(`No viable alternative.\n${chalk.red(source.pan(-100, true))}<- is not ${tokenizer.name}`)
                    }
                }
            } else {
                if (!tokenizer.nullable() && tokenizer.type != 'if-wrapper') {
                    console.log(tokenizer.name, tokenizer.type)
                    throw new Error(`No viable alternative.\n${chalk.red(source.pan(-100, true))}<- is not ${tokenizer.name}`)
                }
            }
        }
        return tokens
    }

    test(source: Input): boolean {
        source.push()
        if (this.stack.length > 0) {
            let result = false
            let pass = 0
            for (let j = 0; j < this.stack.length; j++) {
                const tokenizer = this.stack[j];
                const test = tokenizer.test(source)
                if (test) {
                    result = true
                    tokenizer.read(source)
                    pass++
                    if (tokenizer.type == 'if-wrapper') {
                        source.pop()
                        return true
                    }
                    /* ATTENTION THIS CODE IS AN EXPERIMENTAL CODE!!! */
                    /*     IT MAY OR MAY NOT CAUSE BUGS IN FUTURE     */
                    if (pass >= Math.round(this.stack.length * 0.8)) {
                        source.pop()
                        return true
                    }
                } else if (
                    !(
                        (!test && tokenizer.nullable()) ||
                        (!test && tokenizer.type == 'if-wrapper')
                    )
                ) {
                    source.pop()
                    return false
                }
            }
            source.pop()
            return result
        }
        source.pop()
        return false
    }
}

export class IFWrapper extends Wrapper {
    type: TokenizerType = "if-wrapper"

    tester: Reader

    constructor(name: string, tester: Reader) {
        super(name, undefined)
        tester.parent = this
        this.tester = tester
    }

    test(source: Input) {
        if (this.stack.length > 0) {
            if (this.tester.test(source) && super.test(source)) return true
        }
        return false
    }
}

export class WrapperSerial extends Wrapper {
    read(source: Input): Token[] {
        const tokens: Token[] = []
        return tokens
    }
}