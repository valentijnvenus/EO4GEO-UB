import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { catchError, map, switchMap } from 'rxjs/operators';
import { formatDate } from '@angular/common';
import { environment } from '../../environments/environment';
import { ApiUpdateService } from './apiUpdateService.service';

@Injectable({
  providedIn: 'root'
})
export class FileUploadServiceService {
  constructor(private http: HttpClient, private apiUpdateService: ApiUpdateService) { }


  public URL_BASE = environment.URL_BASE;
  public URL_BACKUP = environment.URL_BACKUP;
  private URL_UPDATE_SERVICE = environment.URL_UPDATE_SERVICE;

  public allBoKs = null;
  public resp = {};

  uploadNewBoK(file: any, token: any) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };
    return this.currentVersions().subscribe((cversions) => {
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
        switchMap(() => this.updateReplicas(token)),
        switchMap(() => this.apiUpdateService.convertBoKAPIPreviousVersion(token)),
      ).subscribe(
        err => console.log(err),
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
    this.http.put(vUrl, currentFile, httpOptions).pipe(
      switchMap(() => this.updateReplicas(token)),
      switchMap(() => this.apiUpdateService.convertBoKAPIPreviousVersion(token)),
    ).subscribe(
      err => console.log(err),
    );
  }

  deleteCurrentVersion(allBoKs, token: any): Observable<any> {
    // Remove current current the new version and move the current one to vNum
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };

    const currentFile = JSON.stringify(allBoKs);

    const vUrl = this.URL_BASE + '.json?auth=' + token;
    return this.http.put(vUrl, currentFile, httpOptions).pipe(
      switchMap(() => this.updateReplicas(token)),
      switchMap(() => this.apiUpdateService.convertBoKAPIPreviousVersion(token)),
    )
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

  recoverFromBackup(token: any): Observable<any> {
    return this.http.get(this.URL_BACKUP + '.json').pipe(
      switchMap((response: any) => {
        if (!response) throw new Error('No response received');
        this.allBoKs = response;
        const currentFile = JSON.stringify(this.allBoKs);
        
        const httpOptions = {
          headers: new HttpHeaders({
            'Content-Type': 'application/json'
          })
        };
        return this.http.put(this.URL_BASE + '.json?auth=' + token, currentFile, httpOptions);
      }),
      switchMap(() => this.updateReplicas(token)),
      switchMap(() => this.apiUpdateService.convertBoKAPIPreviousVersion(token)),
    );
  }
  

  updateReplicas(idToken: string, projects?: string[]): Observable<any> {
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Authorization': `Bearer ${idToken}`,
    };
    const body = projects ? { 'projects': projects } : {};

    return this.http.put(
      this.URL_UPDATE_SERVICE + 'update-backups',
      body,
      {
        headers,
        observe: 'response',
        responseType: 'text'
      }
    );
  }

  updateBackup(idToken: string): Observable<any> {
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Authorization': `Bearer ${idToken}`,
    };
    const body = { 'projects': ['findinbok'] };

    return this.http.put(
      this.URL_UPDATE_SERVICE + 'update-backups',
      body,
      {
        headers,
        observe: 'response',
        responseType: 'text'
      }
    );
  }

  getReplicasState(idToken: string): Observable<any> {
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Authorization': `Bearer ${idToken}`,
    };
    return this.http.get(
      this.URL_UPDATE_SERVICE + 'backups-state',
      {
        headers,
        observe: 'response',
        responseType: 'json'
      }
    );
  }


}
