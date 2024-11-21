import { Injectable } from "@angular/core";
import { Observable, forkJoin, from, throwError } from "rxjs";
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
        throw error;
      })
    );
  }

  private deleteVersions(targetVersion: number): Observable<any> {
    return this.GetRDFVersion().pipe(
      switchMap(rdfVersion => {
        const deleteObservables = [];
        for (let i = rdfVersion - 1; i > targetVersion; i--) {
          const filePath = `RDF/Versions/BoK_${i}.ttl`;
          deleteObservables.push(this.deleteFile(filePath));
        }
        return forkJoin(deleteObservables);
      })
    );
  }

  UpdateRDFVersion (bok: any): Observable<any> {
    const ttlFile: string = this.bokToRdf.GetRDFString(bok.current);

    return this.uploadFileFromString('RDF/Versions/BoK_' + bok.current.version + '.ttl', ttlFile, bok.current.version).pipe(
      switchMap(() => this.uploadFileFromString('RDF/BoK.ttl', ttlFile, bok.current.version))
    );
  }

  DeleteCurrentRDFVersion (newBok: any): Observable<any> {
    return this.deleteVersions(newBok.current.version).pipe(
      switchMap(() => {
        const fileRef = this.storage.ref(`RDF/Versions/BoK_${newBok.current.version}.ttl`);
        return fileRef.getDownloadURL();
      }),
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
    return this.deleteVersions(0).pipe(
      switchMap(() => {
        const observables = [];
        let ttlFile: string = "";
        for (let i = 1; i <= bokBackup.current.version; i++) {
          ttlFile = this.bokToRdf.GetRDFString(bokBackup[`v${i}`]);
          observables.push(this.uploadFileFromString(`RDF/Versions/BoK_${i}.ttl`, ttlFile, i.toString()));
        }
        observables.push(this.uploadFileFromString('RDF/BoK.ttl', ttlFile, bokBackup.current.version));
        return forkJoin(observables);
      }),
      catchError(error => {
        console.error('Error in RecoverFromBackup:', error);
        return throwError(() => error);
      })
    )
  }

  GetRDFVersion (): Observable<number> {
    const fileRef = this.storage.ref('RDF/BoK.ttl');
    return fileRef.getMetadata().pipe(map(metadata => {
      const fileVersion = metadata.customMetadata?.version;
      return fileVersion ? Number(fileVersion) : NaN;
    }));
  }
  
}
