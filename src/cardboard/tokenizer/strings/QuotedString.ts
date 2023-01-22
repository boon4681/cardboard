import { GroupSerial } from "../base/group"
import { Reader } from "../base/reader"
import { IFWrapper, Wrapper } from "../base/wrapper"

function QuotedStringBuilder() {
    const QuotedString = new IFWrapper('strings.quoted', new Reader('strings.quoted.tester', /'/))
    const QuotedStringInner = new Wrapper('strings.quoted.inner')
    const QuotedStringText = new GroupSerial('strings.quoted.inner.text', { mode: 'normal', nullable: true })

    QuotedString.wrap(wrap => {
        wrap(new Reader('strings.quoted.open', /\'/, {
            mode: 'push',
            tokenizer: QuotedStringInner
        }))
    })

    QuotedStringInner.wrap(wrap => {
        wrap(QuotedStringText)
        wrap(new Reader('strings.double_quoted.close', /\'/, {
            mode: 'pop'
        }))
    })

    QuotedStringText.wrap(wrap => {
        wrap(new Reader('text', /[^\\\'\r\n]+/, { mode: 'normal', nullable: true }))
        wrap(new Reader('escape', /\\[tbrn\"\'\\]/, { mode: 'normal', nullable: true }))
    })

    return QuotedString
}

export const QuotedString = QuotedStringBuilder()