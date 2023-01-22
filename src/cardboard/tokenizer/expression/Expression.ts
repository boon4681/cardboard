import { Group, GroupSerial } from "../base/group";
import { Reader } from "../base/reader";
import { IFWrapper, Wrapper, WrapperSerial } from "../base/wrapper";
import { Hidden, hidden, identifier } from "../basic";
import { Strings } from "../strings/Strings";
import { Value } from "./Value";


function ExpressionBuilder() {
    const expression = new Wrapper('expression')
    const expressionValue = new Wrapper('tokenizer.value.wrapper')
    const expressionSerialValue = new GroupSerial('tokenizer.value.group', { mode: 'normal', nullable: true })

    const expressionOptionsWrapper = new Wrapper('tokenizer.options', { mode: 'normal', nullable: true })

    const expressionOption = new Wrapper('tokenizer.option')
    const expressionOptions = new WrapperSerial('tokenizer.option', { mode: 'normal', nullable: true })

    const groupOptions = new Group('tokenizer.options')
    const pushOption = new Wrapper('tokenizer.option.push')

    expression.wrap(wrap => {
        wrap(identifier.clone({ name: 'tokenizer.name' }))
        wrap(hidden)
        wrap(new IFWrapper('tokenizer.assign', new Reader('tokenizer.assign', /=/)).wrap(wrap => {
            wrap(new Reader('tokenizer.assign', /=/, {
                mode: 'push',
                tokenizer: expressionValue
            }))
        }))
        wrap(expressionOptionsWrapper)
        wrap(new Reader('tokenizer.end', /;/))
    })

    expressionValue.wrap(wrap => {
        wrap(Value)
        wrap(expressionSerialValue)
        wrap(expressionOptionsWrapper)
        wrap(new Reader('tokenizer.end', /;/, {
            mode: 'pop'
        }))
    })

    expressionSerialValue.wrap(wrap => {
        wrap(Value)
    })

    expressionOptionsWrapper.wrap(wrap => {
        wrap(hidden)
        wrap(new Reader('tokenizer.options.arrow', /\-\>/))
        wrap(hidden)
        wrap(expressionOption)
        wrap(expressionOptions)
    })

    expressionOption.wrap(wrap => {
        wrap(hidden)
        wrap(groupOptions)
    })

    expressionOptions.wrap(wrap => {
        wrap(new Reader(',', /,/))
        wrap(expressionOption)
    })

    groupOptions.wrap(wrap => {
        wrap(new Reader('tokenizer.option.ignore.keyword', /normal/))
        wrap(pushOption)
        wrap(new Reader('tokenizer.option.pop.keyword', /pop/))
        wrap(new Reader('tokenizer.option.ignore.keyword', /ignore/))
        wrap(new Reader('tokenizer.option.fragment.keyword', /fragment/))
    })

    pushOption.wrap(wrap => {
        wrap(new Reader('tokenizer.option.push.keyword', /push/))
        wrap(hidden)
        wrap(new Reader('tokenizer.option.push.parent.open', /\(/))
        wrap(hidden)
        wrap(identifier.clone({ name: 'lexer.name' }))
        wrap(hidden)
        wrap(new Reader('tokenizer.option.push.parent.close', /\)/))
        wrap(hidden)
    })

    return expression
}

export const Expression = ExpressionBuilder()