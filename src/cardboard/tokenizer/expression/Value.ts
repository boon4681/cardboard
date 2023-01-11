import { Group } from "../../base/group";
import { Reader } from "../../base/reader";
import { Wrapper } from "../../base/wrapper";
import { Hidden, identifier } from "../basic";
import { Strings } from "../strings/Strings";


function ValueBuilder() {
    const Value = new Wrapper('tokenizer.value')

    Value.wrap(wrap => {
        const group = new Group('tokenizer.value.group')
        wrap(Hidden)
        wrap(group)
        group.wrap(wrap => {
            wrap(Strings)
            wrap(identifier.clone({ name: 'lexer.name' }))
            wrap(new Reader('cardboard.metadata', /\@(?:[_\w][_\w\d]*)(?:\.(?:[_\w][_\w\d]*))*/))
        })
    })
    return Value
}

export const Value = ValueBuilder()