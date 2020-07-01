import { Injectable } from '@angular/core';
import { Observable , throwError} from 'rxjs';
import { HttpClient, HttpErrorResponse} from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import {catchError} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class FileUploadServiceService {
  constructor(private http: HttpClient) { }

  public URL_BASE = 'https://eo4geo-uji.firebaseio.com/';
  public resp = {};
  uploadFile(file: any, user: any) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };
    return this.currentVersion().pipe(
      catchError(this.handleError)
    ).subscribe( (cversion) => {
          const fileToSave = JSON.stringify(file);
          const newVersion = (parseInt(cversion) + 1).toString();
          file.version = newVersion;
          file.updateDate = new Date();
          file.creationYear = file.updateDate.getFullYear();
          this.resp = file;
          const currentFile = JSON.stringify(file);
          const configUrl = this.URL_BASE + 'v' + newVersion + '.json?auth=' + user;
          const currentUrl = this.URL_BASE + 'current.json?auth=' + user;
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
      err =>  this.resp = err );
  }

  // Get current version
  currentVersion(): Observable<any> {
    return  this.http.get( this.URL_BASE + 'current/version.json');
  }
  handleError(error: Error) {
    return throwError(error);
  }

}
