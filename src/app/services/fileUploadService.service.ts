import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
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
          this.updateBackups(token);
        },
        err => this.resp = err,
      );
    })
  }

  async replaceCurrentBok (file: any, token: any) {
    const cversions = {};
    file.creationYear = new Date().getFullYear();
    file.version = '1';
    file.updateDate = formatDate(new Date(), 'yyyy/MM/dd', 'en');

    cversions['current'] = file;

    this.allBoKs = cversions;

    const currentFile = JSON.stringify(cversions);

    const vUrl = this.URL_BASE + '.json?auth=' + token;
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
    };
    try {
      const response = await this.http.put(vUrl, currentFile, httpOptions).toPromise();
      if (!response) throw new Error('No response received');
      this.resp = response;
      this.updateBackups(token);
    } catch (error) {
      this.resp = error;
      console.error('There was an error!', error);
    }
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
        this.updateBackups(token);
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

  async recoverFromBackup(token: any) {
    try {
      const response = await this.http.get(this.URL_BACKUP + '.json').toPromise();
      if (!response) throw new Error('No response received');
      this.allBoKs = response;
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
          this.updateBackups(token);
        },
        err => this.resp = err,
      );
    } catch (error) {
      console.error('Error updating backups: ' + error);
      throw new Error('Error updating backups: ' + error);
    }
  }

  updateBackups(idToken: string, projects?: string[]): Observable<any> {
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Authorization': `Bearer ${idToken}`,
    };
    const body = projects ? { 'projects': projects } : {};

    return this.http.put(
      'https://eo4geo-update-bok-backups.onrender.com/update-backups',
      body,
      {
        headers,
        observe: 'response',
        responseType: 'text'
      }
    );
  }

  getBackupsState(idToken: string): Observable<any> {
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Authorization': `Bearer ${idToken}`,
    };
    return this.http.get(
      'https://eo4geo-update-bok-backups.onrender.com/backups-state',
      {
        headers,
        observe: 'response',
        responseType: 'json'
      }
    );
  }


}
