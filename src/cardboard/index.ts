import chalk from "chalk"
import { Input, LexerBase, Tokenizer } from "pulpboard"
import { Lexer } from "./lexer"
import { Parser } from "./parser"

export class Cardboard {
    private load?: LexerBase
    scheme: Tokenizer[] = []
    constructor(grammar: Input, debug: boolean = false) {
        let recursion_test = new Array<String>(2).fill("")
        const test = recursion_test.reduce((a, b, i) => {
            return `lexer hi_${i + 1}{ ${a}}`
        }, `x="y\\""`)
        const raw = '#hi\n\r#yo\n\r' + test + ''
        // const raw = test + ''
        // console.log(raw)
        // writeFileSync('./test',raw)
        // console.log(Buffer.byteLength(raw, 'utf8'))
        // const input = new Input('./test/grammar/test.box', raw)
        const lexer = new Lexer(grammar)
        lexer.disable_debugger = !debug
        const parser = new Parser()
        lexer.read()
        // console.log(JSON.stringify(lexer.tokens))
        // console.log(lexer.tokens.map(a => a.raw).join(''))
        // console.log(lexer.tokens.map(a => {
        //     return {
        //         name: a.name,
        //         value: a.value
        //     }
        // }))
        this.load = parser.parse(lexer)
        this.scheme = this.load.scheme
    }
    run(input: Input) {
        if (this.load) {
            this.load.read(input)
            return this.load.tokens
        }
    }
}