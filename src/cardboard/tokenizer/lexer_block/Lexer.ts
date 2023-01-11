import { GroupSerial } from "../../base/group"
import { Reader } from "../../base/reader"
import { Wrapper } from "../../base/wrapper"
import { hidden, Hidden, identifier } from "../basic"
import { Expression } from "../expression/Expression"
import { IF } from "../if_statement/IF"


function LexerBuilder() {
    const lexer = new Wrapper('lexer')
    const lexerBlock = new Wrapper('lexer.block')
    const lexerBlockContent = new GroupSerial('lexer.block.content', { mode: 'normal', nullable: true })

    lexer.wrap(wrap => {
        wrap(new Reader('lexer.keyword', /lexer/))
        wrap(Hidden)
        wrap(identifier.clone({ name: 'lexer.name' }))
        wrap(hidden)
        wrap(new Reader('lexer.block.punctuation.open', /\{/, {
            mode: 'push',
            tokenizer: lexerBlock
        }))
    })

    lexerBlock.wrap(wrap => {
        wrap(hidden)
        wrap(lexerBlockContent)
        wrap(hidden)
        wrap(new Reader('lexer.block.punctuation.close', /\}/, {
            mode: 'pop'
        }))
    })

    lexerBlockContent.wrap(wrap => {
        wrap(Hidden)
        wrap(lexer)
        wrap(Expression)
        wrap(IF)
    })

    return lexer
}

export const Lexer = LexerBuilder()