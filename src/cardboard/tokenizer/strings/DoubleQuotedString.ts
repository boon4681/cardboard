import { GroupSerial } from "../../base/group"
import { Reader } from "../../base/reader"
import { IFWrapper, Wrapper } from "../../base/wrapper"

function DoubleQuotedStringBuilder() {
    const DoubleQuotedString = new IFWrapper('strings.quoted', new Reader('strings.quoted.tester', /"/))
    const DoubleQuotedStringInner = new Wrapper('strings.quoted.inner')
    const DoubleQuotedStringText = new GroupSerial('strings.quoted.inner.text', { mode: 'normal', nullable: true })

    DoubleQuotedString.wrap(wrap => {
        wrap(new Reader('strings.quoted.open', /\"/, {
            mode: 'push',
            tokenizer: DoubleQuotedStringInner
        }))
    })

    DoubleQuotedStringInner.wrap(wrap => {
        wrap(DoubleQuotedStringText)
        wrap(new Reader('strings.double_quoted.close', /\"/, {
            mode: 'pop'
        }))
    })

    DoubleQuotedStringText.wrap(wrap => {
        wrap(new Reader('text', /[^\\\"\r\n]+/, { mode: 'normal', nullable: true }))
        wrap(new Reader('escape', /\\[tbrn\"\'\\]/, { mode: 'normal', nullable: true }))
    })

    return DoubleQuotedString
}

export const DoubleQuotedString = DoubleQuotedStringBuilder()