import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { formatDate } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class FileUploadServiceService {
  constructor(private http: HttpClient) { }


  public URL_BASE = 'https://ucgis-bok-default-rtdb.firebaseio.com/';
/*   public URL_BASE_BOKAPI = 'https://eo4geo-bok.firebaseio.com/';
  public URL_BASE_BACKUP1 = 'https://findinbok.firebaseio.com/';
  public URL_BASE_BACKUP2 = 'https://eo4geo-uji-backup.firebaseio.com/'; */


  public resp = {};
  uploadFile(file: any, user: any) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };

    const currentFile = JSON.stringify(file);
    const currentUrl = this.URL_BASE + 'current.json?auth=' + user;

    this.http.put(currentUrl, currentFile, httpOptions).pipe(
      catchError(this.handleError)
    ).subscribe(
      res => this.resp = res,
      err => this.resp = err,
    );

  }

  uploadBoKAPIFile(newVersion, file: any) {
/*     const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };
      const fileToSave = JSON.stringify(file);
      this.resp = file;
      const configUrl = this.URL_BASE_BOKAPI + newVersion + '.json';
      this.http.put(configUrl, fileToSave, httpOptions).pipe(
        catchError(this.handleError)
      ).subscribe(
        res => this.resp = res,
        err => this.resp = err,
      ); */
  }

  handleError(error: Error) {
    return throwError(error);
  }

}
