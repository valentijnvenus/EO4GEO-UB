import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { FileUploadServiceService } from "./fileUploadService.service";
import { environment } from "../../environments/environment";
import { catchError } from "rxjs/operators";

@Injectable ({
    providedIn: "root"
})
export class ApiUpdateService {

  private BOK_BASE_URI = environment.BOK_BASE_URI;
  private URL_BASE_BOKAPI = environment.URL_BASE_BOKAPI;

  constructor(private http: HttpClient, private fileUploadService: FileUploadServiceService) {}

  private uploadBoKAPIFile(newVersion: string, file: any): void {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };
    const fileToSave = JSON.stringify(file);
    const configUrl = this.URL_BASE_BOKAPI + newVersion + '.json';
    this.http.put(configUrl, fileToSave, httpOptions).subscribe(
      response => console.log('Successful API update!', response),
      error => console.error('Error updating API:', error)
    );
  }

  convertBoKAPIPreviousVersion() {
    this.fileUploadService.fullBoK().subscribe((fullBoK) => {
      const allV = Object.keys(fullBoK);

      allV.forEach(v => {
        const fileToSave = this.convertFileBoKAPI(fullBoK[v]);
        this.uploadBoKAPIFile(v, fileToSave);
      });
    });
  }
    
  private convertFileBoKAPI(version: any): any {
    const codeNameHash = {};

    const fileToSave = { 'concepts': {}, 'relations': [], 'references': [], 'skills': [], 'contributors': [] };

    version.concepts.forEach((c, k) => {
      if (c.code && c.code !== '') {
        fileToSave.concepts[c.code] = {
          name: c.name,
          id: c.code,
          description: c.description,
          uri: this.BOK_BASE_URI + c.code,
          relations: [],
          references: [],
          skills: [],
          contributors: []
        };
      }
      codeNameHash[k] = c.code;
    });

    if (version.references) {
      version.references.forEach(r => {
        fileToSave.references.push({
          name: r.name,
          url: r.url,
          description: r.description,
          concepts: []
        });

        r.concepts.forEach(c => {
          if (codeNameHash[c] && codeNameHash[c] !== '') {
            fileToSave.concepts[codeNameHash[c]].references.push({
              url: r.url,
              description: r.description,
              name: r.name
            });
            fileToSave.references[fileToSave.references.length - 1].concepts.push(codeNameHash[c]);
          }
        });
      });
    }

    if (version.contributors) {
      version.contributors.forEach(r => {
        fileToSave.contributors.push({
          name: r.name,
          url: r.url,
          description: r.description,
          concepts: []
        });

        r.concepts.forEach(c => {
          if (codeNameHash[c] && codeNameHash[c] !== '') {
            fileToSave.concepts[codeNameHash[c]].contributors.push({
              url: r.url,
              description: r.description,
              name: r.name
            });
            fileToSave.contributors[fileToSave.contributors.length - 1].concepts.push(codeNameHash[c]);
          }
        });
      });
    }
    if (version.skills) {
      version.skills.forEach(r => {
        fileToSave.skills.push({
          name: r.name,
          concepts: []
        });

        r.concepts.forEach(c => {
          if (codeNameHash[c] && codeNameHash[c] !== '') {
            fileToSave.concepts[codeNameHash[c]].skills.push(r.name);
            fileToSave.skills[fileToSave.skills.length - 1].concepts.push(codeNameHash[c]);
          }
        });
      });
    }
    if (version.relations) {
      version.relations.forEach(r => {

        if (codeNameHash[r.source] && codeNameHash[r.target]) {
          fileToSave.relations.push({
            name: r.name,
            source: codeNameHash[r.source],
            target: codeNameHash[r.target]
          });
          fileToSave.concepts[codeNameHash[r.source]].relations.push({
            name: r.name,
            source: codeNameHash[r.source],
            target: codeNameHash[r.target]
          });
          fileToSave.concepts[codeNameHash[r.target]].relations.push({
            name: r.name,
            source: codeNameHash[r.source],
            target: codeNameHash[r.target]
          });
        } else {
          console.log('fail source ' + r.source)
          console.log('fail target ' + r.target)
        }
      });
    }
    return fileToSave;
  }
}