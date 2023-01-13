import chalk from "chalk"
import { Input, Lexer, Token, Tokenizer, TokenizerOptions, TokenizerType } from "../../lexer"
import { Reader } from "./reader"

export class Wrapper implements Tokenizer {
    name: string
    type: TokenizerType = "wrapper"
    parent!: Lexer
    options: TokenizerOptions = { mode: 'normal', fragment: false, ignored: false, nullable: false }

    stack: Tokenizer[] = []

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
            tokenizer.parent = tokenizer.parent
            self.stack.push(tokenizer)
        }
        callback(wrap)
        return this
    }

    read(source: Input): Token[] {
        const tokens: Token[] = []
        for (const tnz of this.stack) {
            if (tnz.fragment()) continue
            // if (source.stack.length == 0) 
            // console.log('@wrapper', this.strip(tokenizer), tokenizer.test(source))
            if (tnz.test(source)) {
                const result = tnz.read(source)
                // if (source.stack.length == 0) console.log(result)
                if (result) {
                    if (tnz.type == 'reader' || tnz.type == 'wrapper') {
                        if (!tnz.options.ignored) {
                            tokens.push(...[result].flat(1))
                        }
                        if (tnz.options.mode == "pop") {
                            this.parent.queue.shift()
                        }
                        if (tnz.options.mode == "push") {
                            if (tnz.options.tokenizer === 'self') {
                                this.parent.queue.unshift(this)
                            } else {
                                tnz.options.tokenizer.parent = this.parent
                                this.parent.queue.unshift(tnz.options.tokenizer)
                            }
                        }
                        if(tnz.options.mode != 'normal'){
                            return tokens
                        }
                    } else if (tnz.type == "group") {
                        if (!tnz.options.ignored) {
                            tokens.push(...result as Token[])
                        }
                    } else if (tnz.type == "if-wrapper") {
                        tokens.push(...result as Token[])
                        return tokens
                    }
                } else {
                    if (!tnz.nullable() && tnz.type != 'if-wrapper') {
                        throw new Error(`No viable alternative.\n${chalk.red(source.pan(-100, true))}<- is not ${tnz.name}`)
                    }
                }
            } else {
                if (!tnz.nullable() && tnz.type != 'if-wrapper') {
                    // console.log(tokenizer.name, tokenizer.type)
                    throw new Error(`No viable alternative.\n${chalk.red(source.pan(-100, true))}<- is not ${tnz.name}`)
                }
            }
        }
        return tokens
    }

    test(source: Input): boolean {
        source.push()
        // console.log('@@@@@@@>>> start test')
        if (this.stack.length > 0) {
            let result = false
            let pass = 0
            for (let j = 0; j < this.stack.length; j++) {
                const tokenizer = this.stack[j];
                // console.log("@TEST",tokenizer.name)
                const test = tokenizer.test(source)
                if (test) {
                    result = true
                    // console.log(tokenizer, tokenizer.read(source))
                    tokenizer.read(source)
                    pass++
                    if (tokenizer.type == 'if-wrapper') {
                        source.pop()
                        // console.log('@@@@@@@>>> end test')
                        return true
                    }
                    /* ATTENTION THIS CODE IS AN EXPERIMENTAL CODE!!! */
                    /*     IT MAY OR MAY NOT CAUSE BUGS IN FUTURE     */
                    if (pass >= Math.round(this.stack.length * 0.8)) {
                        source.pop()
                        // console.log('@@@@@@@>>> end test')
                        return true
                    }
                } else if (
                    !(
                        (!test && tokenizer.nullable()) ||
                        (!test && tokenizer.type == 'if-wrapper')
                    )
                ) {
                    source.pop()
                    // console.log('@@@@@@@>>> end test')
                    return false
                }
            }
            source.pop()
            // console.log('@@@@@@@>>> end test')
            return result
        }
        source.pop()
        // console.log('@@@@@@@>>> end test')
        return false
    }
}

export class IFWrapper extends Wrapper {
    type: TokenizerType = "if-wrapper"

    tester: Reader

    constructor(name: string, tester: Reader) {
        super(name, undefined)
        tester.parent = this.parent
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