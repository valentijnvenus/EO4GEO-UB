import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { formatDate } from '@angular/common';
import * as v7 from '../../assets/json/eo4geo-v7.json';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FileUploadServiceService {
  constructor(private http: HttpClient) { }


  public URL_BASE = environment.URL_BASE;

  public allBoKs = null;
  public resp = {};

  uploadNewBoK(file: any, token: any) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };
    return this.currentVersions().pipe(
      catchError(this.handleError)
    ).subscribe((cversions) => {
      file.creationYear = new Date().getFullYear();
      const newVersionNum = (parseInt(cversions.current.version) + 1).toString();
      const currentVersionNum = (parseInt(cversions.current.version)).toString();
      file.version = newVersionNum;
      file.updateDate = formatDate(new Date(), 'yyyy/MM/dd', 'en');

      // Put in current the new version and move the current one to vNum
      cversions['v' + currentVersionNum] = cversions.current;
      cversions['current'] = file;

      this.allBoKs = cversions;

      const currentFile = JSON.stringify(cversions);

      const vUrl = this.URL_BASE + '.json?auth=' + token;
      this.http.put(vUrl, currentFile, httpOptions).pipe(
        catchError(this.handleError)
      ).subscribe(
        res => this.resp = res,
        err => this.resp = err,
      );
    })
  }

  deleteCurrentVersion(allBoKs, token: any) {
    // Remove current current the new version and move the current one to vNum
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };

    const currentFile = JSON.stringify(allBoKs);

    const vUrl = this.URL_BASE + '.json?auth=' + token;
    this.http.put(vUrl, currentFile, httpOptions).pipe(
      catchError(this.handleError)
    ).subscribe(
      res => this.resp = res,
      err => this.resp = err,
    );
  }

  // Get fullBoK
  fullBoK(): Observable<any> {
    return this.http.get(this.URL_BASE + '.json');
  }

  // Get current version
  currentVersion(): Observable<any> {
    return this.http.get(this.URL_BASE + 'current/version.json');
  }

  // Get current versions in BoK Versioning
  currentVersions(): Observable<any> {
    return this.http.get(this.URL_BASE + '.json');
  }

  handleError(error: Error) {
    return throwError(error);
  }

  recoverV7() {
    this.allBoKs = v7['default'];

    console.log(this.allBoKs)

    const currentFile = JSON.stringify((v7 as any).default);
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };

    console.log('recover v7');

    this.http.put(this.URL_BASE + '.json', currentFile, httpOptions).pipe(
      catchError(this.handleError)
    ).subscribe(
      res => this.resp = res,
      err => this.resp = err,
    );
  }


}
