import { Injectable } from "@angular/core";
import { Observable, forkJoin, from, throwError } from "rxjs";
import { Reference } from "../model/rdf/Reference";
import { TreeNode } from "../model/rdf/TreeNode";
import { Skill } from "../model/rdf/Skill";
import { Contributor } from "../model/rdf/Contributor";
import { TreeRelation } from "../model/rdf/TreeRelation";
import { RelationType } from "../model/rdf/RelationType";
import { catchError, map, switchMap } from "rxjs/operators";
import { AngularFireStorage } from "@angular/fire/storage";
import { TTL } from "../model/rdf/ttl";
import { HttpClient } from "@angular/common/http";

@Injectable ({
    providedIn: "root"
})
export class RdfService {

  private ttlPrefix: string = "@prefix dc: <http://purl.org/dc/elements/1.1/> .\n" + 
                              "@prefix dcterms: <http://purl.org/dc/terms/> .\n" +
                              "@prefix eo4geo: <https://bok.eo4geo.eu/> .\n" +
                              "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\n";

  constructor(private http: HttpClient, private storage: AngularFireStorage) {}

  private formatStatus(input: string): string {
    return input
        .replace(/<p>/g, "")
        .replace(/<\/p>/g, "")
  }
  
  private formatCode(input: string, prefix: string = ""): string {
    return prefix + input
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, "_");
  }

  private fillGraph(concepts: any[], relations: any[], graph: Map<string, TreeNode>) {
    concepts.forEach(concept => {
      graph.set(concept.code, new TreeNode(concept.code, concept.name, concept.description, [], [], [], [], this.formatStatus(concept.selfAssesment)));
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
      const newContributor: Contributor = new Contributor(this.formatCode(contributor.name), contributor.name, contributor.description, contributor.url);
      contributorArray.push(newContributor);
      contributor.concepts.forEach(conceptIndex => {
          graph.get(concepts[conceptIndex].code)?.contributors.concat(newContributor.code);
      })
    });
  }

  private fillReferences(references: any[], concepts: any[], graph: Map<string, TreeNode>, referenceArray: Contributor[]) {
    references.forEach(reference => {
      const newReference: Reference = new Reference(this.formatCode(reference.name, "bib_"), reference.name, reference.description, reference.url);
      referenceArray.push(newReference);
      reference.concepts.forEach(conceptIndex => {
          graph.get(concepts[conceptIndex].code)?.references.concat(newReference.code);
      })
    });
  }

  private fillSkills(skills: any[], concepts: any[], graph: Map<string, TreeNode>, skillArray: Skill[]) {
    skills.forEach(skill => {
      const newSkill: Skill = new Skill(this.formatCode(skill.name, "skill_"), skill.name);
      skillArray.push(newSkill);
      skill.concepts.forEach(conceptIndex => {
          graph.get(concepts[conceptIndex].code)?.references.concat(newSkill.code);
      })
    });
  }


  private GetRDFDataStructures(bok: any): {graph: Map<string, TreeNode>, contributors: Contributor[], references: Reference[], skills: Skill[]} {

    const graph: Map<string, TreeNode> = new Map();
    const contributorArray: Contributor[] = [];
    const referenceArray: Reference[] = [];
    const skillArray: Skill[] = [];

    const concepts: any[] = bok.current.concepts;
    const relations: any[] = bok.current.relations;
    const contributors: any[] = bok.current.contributors;
    const references: any[] = bok.current.references;
    const skills: any[] = bok.current.skills;

    this.fillGraph(concepts, relations, graph);
    this.fillContributors(contributors, concepts, graph, contributorArray);
    this.fillReferences(references, concepts, graph, referenceArray);
    this.fillSkills(skills, concepts, graph, skillArray);
    
    return  {
              graph: graph,
              contributors: contributorArray,
              references: referenceArray,
              skills: skillArray,
            }
  } 

  private uploadFileFromString(filePath: string, content: string, version: string): Observable<any> {
    const blob = new Blob([content], { type: 'application/x-turtle' });
    
    const metadata = {
      customMetadata: {
        version: version,
        date: new Date().toISOString(),
      },
    };

    const fileRef = this.storage.ref(filePath);
    const uploadTask = fileRef.put(blob, metadata);

    return from(uploadTask).pipe(
      switchMap(() => fileRef.getDownloadURL()),
      catchError(error => {
        console.error('Error uploading file:', error);
        throw error;
      })
    );
  }

  private deleteFile(filePath: string): Observable<any> {
    const fileRef = this.storage.ref(filePath);

    return from(fileRef.delete()).pipe(
      catchError((error) => {
        console.error('Error deleting file:', error);
        throw error;
      })
    );
  }

  UpdateRDFVersion (bok: any): Observable<any> {
    const { graph, contributors, references, skills } = this.GetRDFDataStructures(bok);

    const allItems: TTL[] = [];
    allItems.concat(contributors, references, skills, Array.from(graph.values()));

    let ttlFile: string = this.ttlPrefix;
    allItems.forEach(item => {
        ttlFile += item.ToTTL();
    });

    return this.uploadFileFromString('RDF/Versions/BoK_' + bok.current.version + '.ttl', ttlFile, bok.current.version).pipe(
      switchMap(() => this.uploadFileFromString('RDF/BoK.ttl', ttlFile, bok.current.version))
    );
  }

  DeleteCurrentRDFVersion (bokVersion: number): Observable<any> {
    return this.GetRDFVersion().pipe(
      switchMap(rdfVersion => {
        const deleteObservables = [];
        for (let i = rdfVersion - 1; i > bokVersion; i--) {
          const filePath = `RDF/Versions/BoK_${i}.ttl`;
          deleteObservables.push(this.deleteFile(filePath));
        }
        return forkJoin(deleteObservables);
      }),
      switchMap(() => {
        const fileRef = this.storage.ref(`RDF/Versions/BoK_${bokVersion}.ttl`);
        return fileRef.getDownloadURL();
      }),
      switchMap(downloadUrl => {
        return this.http.get(downloadUrl, { responseType: 'text' });
      }),
      switchMap(fileContent => {
        return this.uploadFileFromString('RDF/BoK.ttl', fileContent, bokVersion.toString());
      }),
      catchError(error => {
        console.error('Error in DeleteCurrentRDFVersion:', error);
        return throwError(() => error);
      })
    );
  }

  RecoverFromBackup (): Observable<any> {
    // TODO
  }

  GetRDFVersion (): Observable<number> {
    const fileRef = this.storage.ref('RDF/BoK.ttl');
    return fileRef.getMetadata().pipe(map(metadata => {
      const fileVersion = metadata.customMetadata?.version;
      return fileVersion ? Number(fileVersion) : NaN;
    }));
  }
  
}
