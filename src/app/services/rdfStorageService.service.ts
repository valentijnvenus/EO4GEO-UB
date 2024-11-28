import { Injectable } from "@angular/core";
import { Observable, forkJoin, from, of, throwError } from "rxjs";
import { catchError, map, switchMap } from "rxjs/operators";
import { AngularFireStorage } from "@angular/fire/storage";
import { BokToRdf } from "./BokToRdf.service";

@Injectable ({
    providedIn: "root"
})
export class RdfStorageService {

  constructor(private storage: AngularFireStorage, private bokToRdf: BokToRdf) {}

  private uploadFileFromString(filePath: string, content: string, version: string): Observable<any> {
    const blob = new Blob([content], { type: 'application/x-turtle' });
    
    const metadata = {
      customMetadata: {
        version: version,
        date: new Date().toISOString(),
      },
    };

    const fileRef = this.storage.ref(filePath);
    const uploadTask = fileRef.put(blob, metadata);

    return from(uploadTask).pipe(
      catchError(error => {
        console.error('Error uploading file:', error);
        throw error;
      })
    );
  }

  private deleteFile(filePath: string): Observable<any> {
    const fileRef = this.storage.ref(filePath);

    return from(fileRef.delete()).pipe(
      catchError((error) => {
        console.error('Error deleting file:', error);
        return of(null);
      })
    );
  }

  private deleteVersions(targetVersion: number): Observable<any> {
    return this.GetRDFVersion().pipe(
      switchMap(rdfVersion => {
        const deleteObservables = [];
        for (let i = (Number(rdfVersion) - 1); i >= targetVersion; i--) {
          const filePath = `RDF/Versions/BoK_${i}.ttl`;
          deleteObservables.push(this.deleteFile(filePath));
        }
        return forkJoin(deleteObservables);
      })
    );
  }

  UpdateRDFVersion (bok: any): Observable<any> {
    const previousVersion: number = bok.current.version - 1 
    const previousTtlFile = this.bokToRdf.GetRDFString(bok['v' + previousVersion])
    const ttlFile: string = this.bokToRdf.GetRDFString(bok.current);
    return this.uploadFileFromString('RDF/BoK.ttl', ttlFile, bok.current.version).pipe(
      switchMap(() => {
        return this.uploadFileFromString(`RDF/Versions/Bok_${previousVersion}.ttl`, previousTtlFile, previousVersion.toString());
      })
    );
  }

  ReplaceRDFVersion (bok: any): Observable<any> {
    const ttlFile: string = this.bokToRdf.GetRDFString(bok.current);
    return this.uploadFileFromString('RDF/BoK.ttl', ttlFile, bok.current.version);
  }

  DeleteCurrentRDFVersion (newBok: any): Observable<any> {
    return this.deleteVersions(newBok.current.version).pipe(
      switchMap(() => {
        const ttlFile: string = this.bokToRdf.GetRDFString(newBok.current);
        return this.uploadFileFromString('RDF/BoK.ttl', ttlFile, newBok.current.version);
      }),
      catchError(error => {
        console.error('Error in DeleteCurrentRDFVersion:', error);
        return throwError(() => error);
      })
    );
  }

  RecoverFromBackup (bokBackup: any): Observable<any> {
    return this.deleteVersions(1).pipe(
      switchMap(() => {
        const observables = [];
        let ttlFile: string = "";
        for (let i = 1; i < bokBackup.current.version; i++) {
          ttlFile = this.bokToRdf.GetRDFString(bokBackup[`v${i}`]);
          observables.push(this.uploadFileFromString(`RDF/Versions/BoK_${i}.ttl`, ttlFile, i.toString()));
        }
        ttlFile = this.bokToRdf.GetRDFString(bokBackup['current']);
        observables.push(this.uploadFileFromString('RDF/BoK.ttl', ttlFile, bokBackup.current.version));
        return forkJoin(observables);
      }),
      catchError(error => {
        console.error('Error in RecoverFromBackup:', error);
        return throwError(() => error);
      })
    )
  }

  GetRDFVersion (): Observable<string> {
    const fileRef = this.storage.ref('RDF/BoK.ttl');
    return fileRef.getMetadata().pipe(map(metadata => {
      const customMetadata = metadata.customMetadata || {};
      const fileVersion = customMetadata.version || "";
      return fileVersion;
    }));
  }
  
}
