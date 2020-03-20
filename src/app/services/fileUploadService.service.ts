import { Injectable } from '@angular/core';
import { Observable , throwError} from 'rxjs';
import { HttpClient, HttpErrorResponse} from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import {catchError} from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class FileUploadServiceService {
  constructor(private http: HttpClient) { }

  public  URL_BASE = 'https://eo4geo-uji.firebaseio.com/';
  public resp = {};
  uploadFile(file : any, user : any){
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };
    let newFile = this.convertFile(file)
    let fileToSave = JSON.stringify(newFile);
    return this.currentVersion().pipe(
      catchError(this.handleError)
    ).subscribe( (cversion)=> {
      let newVersion  = (parseInt(cversion) + 1).toString();
      newFile.version = newVersion;
      let currentFile = JSON.stringify(newFile);
      let configUrl = this.URL_BASE + 'v' + newVersion + '.json?auth=' + user;
      let currentUrl = this.URL_BASE + 'current.json?auth=' + user;

      this.http.put(configUrl, fileToSave, httpOptions).pipe(
        catchError(this.handleError)
      ).subscribe(
        res => this.resp = res,
        err => this.resp = err,
      );
      this.http.put(currentUrl, currentFile, httpOptions).pipe(
        catchError(this.handleError)
      ).subscribe(
        res => this.resp = res,
        err => this.resp = err,
      );
    },
      err => this.resp = err );

  }

  //Get current version
  currentVersion (): Observable<any> {
    return  this.http.get( this.URL_BASE + 'current/version.json');
  }

  convertFile ( file : any ) : any{
    let fileToSave = {"concepts":[] , "relations":[] , "references":[] , "skills":[] };
    let obj = JSON.parse(file);

    Object.keys(obj["nodes"]).forEach( k => {
      fileToSave.concepts.push({
        "code" : obj["nodes"][k].label.split(']', 1)[0].split('[', 2)[1],
        "name" : obj["nodes"][k].label.split(']')[1],
        "description" : obj["nodes"][k].definition
      });
    });

    Object.keys(obj["links"]).forEach( k => {
      fileToSave.relations.push({
        "target" : obj["links"][k].target,
        "source" : obj["links"][k].source,
        "name" : obj["links"][k].relationName
      });
    });
    Object.keys(obj["external_resources"]).forEach( k => {
      fileToSave.references.push({
        "concepts" : obj["external_resources"][k].nodes,
        "name" : obj["external_resources"][k].title,
        "description" : obj["external_resources"][k].description,
        "url" : obj["external_resources"][k].url
      });
    });

    Object.keys(obj["learning_outcomes"]).forEach( k => {
      fileToSave.skills.push({
        "concepts":obj["learning_outcomes"][k].nodes,
        "name": obj["learning_outcomes"][k].name,
      });
    });

    return fileToSave;

  }
  handleError(error: HttpErrorResponse){
    console.log("lalalalalalalala");
    return throwError(error);
  }

}
