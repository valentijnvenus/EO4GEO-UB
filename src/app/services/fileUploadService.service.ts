import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { formatDate } from '@angular/common';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FileUploadServiceService {
  constructor(private http: HttpClient) { }


  public URL_BASE = environment.URL_BASE;
  public URL_BACKUP = environment.URL_BACKUP;

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
        res => {
          this.resp = res;
          this.updateBackups();
        },
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
      res => {
        this.resp = res;
        this.updateBackups();
      },
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

  recoverFromBackup(token: any) {
    this.allBoKs = this.http.get(this.URL_BACKUP + '.json')

    const currentFile = JSON.stringify(this.allBoKs);
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };

    console.log('Recover from backup');

    this.http.put(this.URL_BASE + '.json?auth=' + token, currentFile, httpOptions).pipe(
      catchError(this.handleError)
    ).subscribe(
      res => {
        this.resp = res;
        this.updateBackups();
      },
      err => this.resp = err,
    );
  }

  private async updateBackups() {
    try{
      const response = await fetch('https://eo4geo-update-bok-backups.onrender.com/update-backups', { method: 'PUT'});
	    if (!response.ok) {
        const problem = await response.text();
        console.log('Error updating backups: ' + problem);
      } 
    } catch (error) {
      console.log('Error updating backups: ' + error);
    }
	}


}
