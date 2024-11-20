import { RelationType } from "./RelationType";

export class TreeRelation {
    target: string;
    type: RelationType;

    constructor(target: string, type: RelationType) {
        this.target = target;
        this.type = type;
    }
}