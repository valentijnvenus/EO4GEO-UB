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


  // public URL_BASE = 'https://ocuprotool.firebaseio.com/';
  public URL_BASE = 'https://ucgis-bok-default-rtdb.firebaseio.com/';
  // public URL_BASE_BOKAPI = 'https://eo4geo-bok.firebaseio.com/';
  public URL_BASE_BOKAPI = 'https://ucgis-api-default-rtdb.firebaseio.com/';
  public URL_BASE_BACKUP1 = 'https://ocuprotool.firebaseio.com/';
  // public URL_BASE_BACKUP2 = 'https://eo4geo-uji-backup.firebaseio.com/';


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
    ).subscribe((cversion) => {
      file.creationYear = new Date().getFullYear();
      const fileToSave = JSON.stringify(file);
      const newVersion = (parseInt(cversion) + 1).toString();
      file.version = newVersion;
      file.updateDate = formatDate(new Date(), 'yyyy/MM/dd', 'en');
      this.resp = file;
      const currentFile = JSON.stringify(file);
      // eo4geo-uji
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
      // findinbok
      const configUrl1 = this.URL_BASE_BACKUP1 + 'v' + newVersion + '.json';
      const currentUrl1 = this.URL_BASE_BACKUP1 + 'current.json';
      this.http.put(configUrl1, fileToSave, httpOptions).pipe(
        catchError(this.handleError)
      ).subscribe(
        res => this.resp = res,
        err => this.resp = err,
      );
      this.http.put(currentUrl1, currentFile, httpOptions).pipe(
        catchError(this.handleError)
      ).subscribe(
        res => this.resp = res,
        err => this.resp = err,
      );
      // eo4geo-uji-backup
      /*   const configUrl2 = this.URL_BASE_BACKUP2 + 'v' + newVersion + '.json';
        const currentUrl2 = this.URL_BASE_BACKUP2 + 'current.json';
        this.http.put(configUrl2, fileToSave, httpOptions).pipe(
          catchError(this.handleError)
        ).subscribe(
          res => this.resp = res,
          err => this.resp = err,
        );
        this.http.put(currentUrl2, currentFile, httpOptions).pipe(
          catchError(this.handleError)
        ).subscribe(
          res => this.resp = res,
          err => this.resp = err,
        ); */
    },
      err => this.resp = err);

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

  // Get fullBoK
  fullBoK(): Observable<any> {
    return this.http.get(this.URL_BASE + '.json');
  }

  handleError(error: Error) {
    return throwError(error);
  }

}
