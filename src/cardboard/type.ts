import { Node } from "./parser_scheme";
export interface HeaderNode extends Node {
    children:Node[]
}
export interface LexerDeclarationNode extends Node {
    decorator?:DecoratorNode;
    keyword:Node;
    name:Node;
    children:Node[]
}
interface DecoratorNode extends Node {
    bind?:BindNode;
    merge?:MergeNode
}
interface BindNode extends Node {
    
}
interface MergeNode extends Node {
    
}
interface ChildrenNode extends Node {
    
}
export interface ExpressionNode extends Node {
    name:Node;
    action?:ActionNode;
    children:Node[]
}
interface ActionNode extends Node {
    name:Node;
    argument?:ArgumentNode
}
interface ArgumentNode extends Node {
    argument:Node
}
export interface IfStatementNode extends Node {
    condition:Node;
    stop?:StopNode;
    children:Node[]
}
interface StopNode extends Node {
    
}
export interface GroupNode extends Node {
    mode:Node;
    children:Node[]
}
export interface WrapperNode extends Node {
    mode:Node;
    children:Node[]
}
export interface BoxNode extends Node {
    header:HeaderNode;
    children:Node[]
}