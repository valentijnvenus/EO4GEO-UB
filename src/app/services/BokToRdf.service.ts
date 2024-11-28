import { Injectable } from "@angular/core";
import { Reference } from "../model/rdf/Reference";
import { TreeNode } from "../model/rdf/TreeNode";
import { Skill } from "../model/rdf/Skill";
import { Contributor } from "../model/rdf/Contributor";
import { TreeRelation } from "../model/rdf/TreeRelation";
import { RelationType } from "../model/rdf/RelationType";
import { TTL } from "../model/rdf/TTL";

@Injectable ({
    providedIn: "root"
})
export class BokToRdf {

  private ttlPrefix: string = "@prefix dc: <http://purl.org/dc/elements/1.1/> .\n" + 
                              "@prefix dcterms: <http://purl.org/dc/terms/> .\n" +
                              "@prefix eo4geo: <https://bok.eo4geo.eu/> .\n" +
                              "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\n";

  private formatStatus(input: string): string {
    return input
        .replace(/<p>/g, "")
        .replace(/<\/p>/g, "")
        .replace(/"/g, "'");
  }
  
  private formatCode(input: string, prefix: string = ""): string {
    return prefix + input
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, "_")
        .replace(/"/g, "'");
  }

  private formatText(input: string): string {
    return input.replace(/"/g, "'");
  }

  private fillGraph(concepts: any[], relations: any[], graph: Map<string, TreeNode>) {
    concepts.forEach(concept => {
      graph.set(concept.code, new TreeNode(concept.code, this.formatText(concept.name), this.formatText(concept.description || ""), [], [], [], [], this.formatStatus(concept.selfAssesment || "")));
    });
    relations.forEach(relation => {
      const sourceCode = concepts[relation.source].code;
      const targetCode = concepts[relation.target].code;
      const sourceNode = graph.get(sourceCode);
      const targetNode = graph.get(targetCode);
  
      if (sourceNode && targetNode) {
          switch (relation.name) {
              case 'is subconcept of':
                  sourceNode.relations.push(new TreeRelation(targetCode, RelationType.IsSubconceptOf));
                  targetNode.relations.push(new TreeRelation(sourceCode, RelationType.IsSuperconceptOf));
                  break;
              case 'is prerequisite of':
                  sourceNode.relations.push(new TreeRelation(targetCode, RelationType.IsPrerequisiteOf));
                  targetNode.relations.push(new TreeRelation(sourceCode, RelationType.HasPrerequisite));
                  break;
              case 'is similar to':
                  sourceNode.relations.push(new TreeRelation(targetCode, RelationType.IsSimilarTo));
                  targetNode.relations.push(new TreeRelation(sourceCode, RelationType.IsSimilarTo));
                  break;
          }
      }
    });
  }

  private fillContributors(contributors: any[], concepts: any[], graph: Map<string, TreeNode>, contributorArray: Contributor[]) {
    contributors.forEach(contributor => {
      const newContributor: Contributor = new Contributor(this.formatCode(contributor.name), this.formatText(contributor.name), this.formatText(contributor.description || ""), contributor.url);
      contributorArray.push(newContributor);
      contributor.concepts.forEach(conceptIndex => {
          const conceptData = graph.get(concepts[conceptIndex].code);
          if (conceptData && conceptData.contributors) {
              conceptData.contributors.concat(newContributor.code);
          }
      })
    });
  }

  private fillReferences(references: any[], concepts: any[], graph: Map<string, TreeNode>, referenceArray: Contributor[]) {
    references.forEach(reference => {
      const newReference: Reference = new Reference(this.formatCode(reference.name, "bib_"), this.formatText(reference.name), this.formatText(reference.description || ""), reference.url);
      referenceArray.push(newReference);
      reference.concepts.forEach(conceptIndex => {
          const conceptData = graph.get(concepts[conceptIndex].code);
          if (conceptData && conceptData.references) {
              conceptData.references.concat(newReference.code);
          }
      })
    });
  }

  private fillSkills(skills: any[], concepts: any[], graph: Map<string, TreeNode>, skillArray: Skill[]) {
    skills.forEach(skill => {
      const newSkill: Skill = new Skill(this.formatCode(skill.name, "skill_"), this.formatText(skill.name));
      skillArray.push(newSkill);
      skill.concepts.forEach(conceptIndex => {
          const conceptData = graph.get(concepts[conceptIndex].code);
          if (conceptData && conceptData.skills) {
              conceptData.skills.concat(newSkill.code);
          }
      })
    });
  }


  private GetRDFDataStructures(bok: any): {graph: Map<string, TreeNode>, contributors: Contributor[], references: Reference[], skills: Skill[]} {

    const graph: Map<string, TreeNode> = new Map();
    const contributorArray: Contributor[] = [];
    const referenceArray: Reference[] = [];
    const skillArray: Skill[] = [];

    const concepts: any[] = bok.concepts;
    const relations: any[] = bok.relations;
    const contributors: any[] = bok.contributors;
    const references: any[] = bok.references;
    const skills: any[] = bok.skills;

    if (concepts && relations) this.fillGraph(concepts, relations, graph);
    if (contributors) this.fillContributors(contributors, concepts, graph, contributorArray);
    if (references) this.fillReferences(references, concepts, graph, referenceArray);
    if (skills) this.fillSkills(skills, concepts, graph, skillArray);
    
    return  {
              graph: graph,
              contributors: contributorArray,
              references: referenceArray,
              skills: skillArray,
            }
  } 

  GetRDFString(bok: any): string {
    let allItems: TTL[] = [];
    const { graph, contributors, references, skills } = this.GetRDFDataStructures(bok);
    allItems = allItems.concat(references, skills, contributors, Array.from(graph.values()));

    let ttlFile: string = this.ttlPrefix;
    allItems.forEach(item => {
        ttlFile += item.ToTTL();
    });

    return ttlFile;
  }
  
}
