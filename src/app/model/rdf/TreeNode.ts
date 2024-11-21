import { RelationType } from "./RelationType";
import { TreeRelation } from "./TreeRelation";
import { TTL } from "./TTL";

export class TreeNode implements TTL {
    code: string;
    name: string;
    description: string;
    contributors: string[];
    relations: TreeRelation[];
    references: string[];
    skills: string[];
    status: string;

    constructor(code: string, name: string, description: string, contributors: string[], relations: TreeRelation[], references: string[], skills: string[], status: string = "") {
        this.code = code;
        this.name = name;
        this.description = description;
        this.contributors = contributors;
        this.relations = relations;
        this.references = references;
        this.skills = skills;
        this.status = status;
    }

    ToTTL(): string {
        let ttlConcept: string =  "eo4geo:" + this.code + " a rdfs:Resource ;\n" + 
                                    "    dc:title \"" + this.name + "\" ;\n" + 
                                    "    dc:description \"" + this.description + "\";\n";
        this.relations.forEach(relation => {
            let ttlRelation: string = "";
            switch(relation.type) {
                case RelationType.IsSubconceptOf:
                    ttlRelation = "isPartOf";
                    break;
                case RelationType.IsSuperconceptOf:
                    ttlRelation = "hasPart";
                    break;
                case RelationType.IsSimilarTo:
                    ttlRelation = "relation";
                    break;
                case RelationType.HasPrerequisite:
                    ttlRelation = "requires";
                    break;
                case RelationType.IsPrerequisiteOf:
                    ttlRelation = "isRequiredBy";
                    break;
            }
            ttlConcept += "    dcterms:" + ttlRelation + " eo4geo:" + relation.target + " ;\n"
        })
        this.contributors.forEach(contributor => {
            ttlConcept += "    dc:contributor eo4geo:" + contributor + " ;\n"
        })
        this.skills.forEach(skill => {
            ttlConcept += "    dc:subject eo4geo:" + skill + " ;\n"
        })
        this.references.forEach(reference => {
            ttlConcept += "    dc:source eo4geo:" + reference + " ;\n"
        })
        ttlConcept += ".\n\n";
        return ttlConcept;
     }
}