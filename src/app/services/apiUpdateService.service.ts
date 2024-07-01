import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { FileUploadServiceService } from "./fileUploadService.service";
import { environment } from "../../environments/environment";
import { forkJoin, Observable, of } from "rxjs";
import { catchError, map, switchMap } from "rxjs/operators";

@Injectable ({
    providedIn: "root"
})
export class ApiUpdateService {

  private BOK_BASE_URI = environment.BOK_BASE_URI;
  private URL_UPDATE_SERVICE = environment.URL_UPDATE_SERVICE;
  private API_BASE_URI = environment.API_BASE_URI;

  constructor(private http: HttpClient, private fileUploadService: FileUploadServiceService) {}

  /**
   * Retrieves the current API version from the server.
   * 
   * @returns An observable that emits the API version information.
   */
  getAPIVersion(): Observable<any> {
    return this.http.get(this.API_BASE_URI + 'current/version.json');
  }

  /**
   * Converts new version of BoK (Body of Knowledge) to API format and uploads them.
   * 
   * @param idToken The authentication token used for uploading.
   * @returns An observable that emits the response from the server.
   */
  convertBoKAPIPreviousVersion(idToken: string): Observable<any> {
    return this.fileUploadService.fullBoK().pipe(
      switchMap(fullBoK => {
        const allV = Object.keys(fullBoK);
        const currVersion = fullBoK.current.version;
        const newApiVersion = {};
        allV.forEach(v => {
          const fileToSave = this.convertFileBoKAPI(fullBoK[v]);
          if (v === 'current') fileToSave.version = currVersion;
          newApiVersion[v] = fileToSave;
        });
        return this.uploadBoKAPIFile(newApiVersion, idToken)
      })
    );
  }

  /**
   * Uploads a file to the BoK (Body of Knowledge) API service.
   * 
   * @param newVersion The version identifier for the file being uploaded.
   * @param file The file data to be uploaded.
   * @param idToken The authentication token for authorization.
   * @returns An observable that emits the response from the server.
   */
  private uploadBoKAPIFile(file: any, idToken: string): Observable<any> {
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Authorization': `Bearer ${idToken}`,
    };
    const httpOptions = {
      headers: new HttpHeaders(headers),
    };
    const fileToSave = JSON.stringify(file);
    const configUrl = this.URL_UPDATE_SERVICE + '.json';
    return this.http.put(configUrl, fileToSave, httpOptions);
  }
    
  /**
   * Converts a version of BoK (Body of Knowledge) data into a structured file format
   * suitable for uploading to an API service.
   * 
   * @param version The version of BoK data to convert.
   * @returns The converted file format containing concepts, relations, references, skills, and contributors.
   */
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