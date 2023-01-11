import { Wrapper } from "../../base/wrapper";
import { DoubleQuotedString } from "./DoubleQuotedString";
import { QuotedString } from "./QuotedString";


function StringsBuilder(){
    const Strings = new Wrapper('strings')
    Strings.wrap(wrap => {
        wrap(QuotedString)
        wrap(DoubleQuotedString)
    })
    return Strings
}

export const Strings = StringsBuilder()
