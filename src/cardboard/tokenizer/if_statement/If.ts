import { Group, GroupSerial } from "../base/group"
import { Reader } from "../base/reader"
import { Wrapper } from "../base/wrapper"
import { Hidden, hidden, identifier } from "../basic"
import { Expression } from "../expression/Expression"
import { Strings } from "../strings/Strings"


function IFBuilder() {
    const IF = new Wrapper('if')
    const condition = new Group('if.condition')

    const IFBlock = new Wrapper('if.block')
    const IFBlockContent = new GroupSerial('if.block.content', { mode: 'normal', nullable: true })

    IF.wrap(wrap => {
        wrap(new Reader('if.keyword', /@if/))
        wrap(hidden)
        wrap(new Reader('if.parent.open', /\(/))
        wrap(hidden)
        wrap(condition)
        wrap(hidden)
        wrap(new Reader('if.parent.close', /\)/))
        wrap(hidden)
        wrap(new Reader('if.block.punctuation.open', /\{/, {
            mode: 'push',
            tokenizer: IFBlock
        }))
    })

    condition.wrap(wrap => {
        wrap(Strings)
        wrap(identifier.clone({ name: 'lexer.name' }))
        wrap(new Reader('cardboard.metadata', /\@(?:[_\w][_\w\d]*)(?:\.(?:[_\w][_\w\d]*))*/))
    })

    IFBlock.wrap(wrap => {
        wrap(hidden)
        wrap(IFBlockContent)
        wrap(hidden)
        wrap(new Reader('if.block.punctuation.close', /\}/, {
            mode: 'pop'
        }))
    })

    IFBlockContent.wrap(wrap => {
        wrap(Hidden)
        wrap(IF)
        wrap(Expression)
    })
    return IF
}


export const IF = IFBuilder()