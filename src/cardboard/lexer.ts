import chalk from "chalk";
import { readFileSync } from "fs";
import { DepthDebug, Input, Reader, Token, Wrapper } from "../lexer";
import { versions_validator } from "../minecraft/registries";


export class Cardboard {
    // async load(version: string) {
    //     if (await versions_validator(version)) {

    //     }
    //     throw new Error(`Cardboard: not found minecraft:${version} version`)
    // }

    constructor() {
        const raw = readFileSync('./grammar/test.mccb', 'utf8')
        const input = new Input('./grammar/test.mccb', raw)
        try {
            new CardboardWrapper(input).read()
        } catch (error: any) {
            console.log(chalk.bgRed.rgb(255, 255, 255)(" ERROR "), error.message)
            console.log(error)
        }
    }
}


export class CardboardWrapper extends Wrapper {

    constructor(source: Input) {
        super(source, 'cardboard', new DepthDebug())

        const whitespace = new Reader({
            name: 'whitespace',
            regex: /\s+/
        }).ignore()

        const whitespaceZERO = new Reader({
            name: 'whitespace.zero',
            regex: /\s*/
        }).ignore()

        const identifier = new Reader({
            name: 'identifier',
            regex: /[_\w][_\w\d]+/
        })

        const hidden = new Reader({
            name: 'hidden',
            regex: /[\s\r\n]*/
        }).ignore()

        const HiddenWrapper = new Wrapper(source, 'hidden', this.depthDebug)
        HiddenWrapper.cwrap((wrap) => {
            wrap(hidden)
        })

        const HeaderWrapper = new Wrapper(source, 'header', this.depthDebug)
        HeaderWrapper.cwrap((wrap) => {
            wrap(new Reader({
                name: 'hashtag',
                regex: /\#/
            }))
            wrap(new Reader({
                name: 'content',
                regex: /[^\r\n]+/
            }))
        })

        const LexerWrapper = new Wrapper(source, 'lexer', this.depthDebug)
        const LexerBlockWrapper = new Wrapper(source, 'lexer.block', this.depthDebug)
        const ExpressionWrapper = new Wrapper(source, 'expression', this.depthDebug)
        this.add_wrapper(HiddenWrapper)
        this.add_wrapper(HeaderWrapper)
        this.add_wrapper(LexerWrapper)
        ExpressionWrapper.cwrap((wrap) => {
            wrap(hidden)
            wrap(identifier.clone({ name: 'reader.name' }))
            wrap(whitespaceZERO)
            wrap(new Reader({
                name: 'reader.assign',
                regex: /=/
            }))
            wrap(whitespaceZERO)
            wrap(new Reader({
                name: 'reader.value',
                regex: /[^\r\n]+/
            }))
        })
        LexerBlockWrapper.cwrap((wrap) => {
            wrap(hidden)
            wrap(LexerWrapper)
            wrap(ExpressionWrapper)
            wrap(new Reader(
                {
                    name: 'lexer.punctuation.wrapper.block.close',
                    regex: /\}/
                },
                {
                    mode: 'pop'
                }
            ))
        })
        LexerWrapper.cwrap((wrap) => {
            wrap(new Reader({
                name: 'lexer.keyword',
                regex: /lexer/
            }))
            wrap(whitespace)
            wrap(identifier.clone({ name: 'lexer.name' }))
            wrap(hidden)
            wrap(new Reader(
                {
                    name: 'lexer.punctuation.wrapper.block.open',
                    regex: /\{/
                },
                {
                    mode: 'push',
                    wrapper: LexerBlockWrapper
                }
            ))
        })

        // const whitespace = new Reader({
        //     name: 'whitespace',
        //     regex: /\s+/
        // }).ignore()
        // const whitespaceZERO = new Reader({
        //     name: 'whitespace',
        //     regex: /\s*/
        // }).ignore()

        // const hidden = new Reader({
        //     name: 'hidden',
        //     regex: /[\s\r\n]+/
        // }).ignore()

        // const HeaderWrapper = new Wrapper(source, 'header')
        // HeaderWrapper.cwrap((wrap) => {
        //     wrap(new Reader({
        //         name: 'hashtag',
        //         regex: /\#/
        //     }))
        //     wrap(new Reader({
        //         name: 'content',
        //         regex: /[^\r\n]+/
        //     }))
        // })

        // const Hidden = new Wrapper(source, 'hidden')
        // Hidden.cwrap((wrap) => {
        //     wrap(hidden)
        // })
        // const LexerBlock = new Wrapper(source, 'lexer.block')
        // const LexerClass = new Wrapper(source, 'lexer')
        // const Expression = new Wrapper(source, 'expr')
        // const QuotedString = new Wrapper(source, 'strings.quoted')
        // const QuotedStringContext = new Wrapper(source, 'strings.context')

        // QuotedStringContext.cwrap((wrap) => {
        //     wrap(new Reader({
        //         name: 'strings.quoted.close',
        //         regex: /\'/
        //     }, {
        //         mode: 'pop'
        //     }))
        //     wrap(new Reader({
        //         name: 'strings.context.text',
        //         regex: /[\\,\']+/
        //     }))
        //     wrap(new Reader({
        //         name: 'strings.context.escape',
        //         regex: /\\[\w\'\"\\]+/
        //     }))
        // })

        // QuotedString.cwrap((wrap) => {
        //     wrap(new Reader({
        //         name: 'strings.qoute.close',
        //         regex: /\'/
        //     },{
        //         mode:'push',
        //         wrapper: QuotedStringContext
        //     }))
        // })

        // const String = new Wrapper(source, 'strings')
        // Expression.cwrap((wrap) => {
        //     wrap(new Reader({
        //         name: 'variable.name',
        //         regex: /[_\w][_\w\d]+/
        //     }))
        //     wrap(hidden)
        //     wrap(new Reader({
        //         name: 'variable.operation.assign',
        //         regex: /=/
        //     }))
        //     wrap(hidden)
        //     wrap(new Reader({
        //         name: 'variable.value',
        //         regex: /[^\r\n]+(\n|\r\n)/
        //     }))
        // })
        // LexerBlock.cwrap((wrap) => {
        //     wrap(new Reader({
        //         name:'hidden',
        //         regex: /[\s\r\n]*/
        //     }).ignore())
        //     wrap(new Reader({
        //         name: 'lexer.punctuation.wrapper.block.close',
        //         regex: /\}/
        //     }, {
        //         mode: 'pop'
        //     }))
        //     LexerClass.wrapper_stack.push(LexerClass)
        //     // this.wrapper_stack.push(Expression)
        // })
        // LexerClass.cwrap((wrap) => {
        //     wrap(whitespaceZERO)
        //     wrap(new Reader({
        //         name: 'lexer.keyword',
        //         regex: /lexer/
        //     }))
        //     wrap(whitespace)
        //     wrap(new Reader({
        //         name: 'lexer.name',
        //         regex: /[_\w][_\w\d]+/
        //     }))
        //     wrap(whitespaceZERO)
        //     wrap(new Reader({
        //         name: 'lexer.punctuation.wrapper.block.open',
        //         regex: /\{/
        //     }, {
        //         mode: 'push',
        //         wrapper: LexerBlock
        //     }))
        // })
        // this.wrapper_stack.push(Hidden)
        // this.wrapper_stack.push(HeaderWrapper)
        // this.wrapper_stack.push(LexerClass)
    }
    read() {
        const tokens: Token[] = []
        while (!this.source.eof()) {
            for (const wrapper of this.wrapper_stack) {
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

export class LexerWrapper extends Wrapper {

}