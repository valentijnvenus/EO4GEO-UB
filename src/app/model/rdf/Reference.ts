import { TTL } from "./ttl";

export class Reference implements TTL{
    code: string;
    name: string;
    description: string;
    url: string;

    constructor(code: string, name: string, description: string, url: string) {
        this.code = code;
        this.name = name;
        this.description = description;
        this.url = url;
    }

    ToTTL(): string {
        return   "eo4geo:" + this.code + " a dcterms:BibliographicResource ;\n" + 
                 "    dc:title '" + this.name + "' ;\n" + 
                 "    dc:description '" + this.description + "';\n" + 
                 "    dc:identifier <" + this.url + "> ;\n" + 
                 ".\n\n";
     }
}