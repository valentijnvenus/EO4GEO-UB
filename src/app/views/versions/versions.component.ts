import { Component, NgZone, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { FileCompareService } from '../../services/fileCompareService.service';
import { FileUploadServiceService } from '../../services/fileUploadService.service';
import { User, UserService } from '../../services/user.service';
import { RdfStorageService } from '../../services/rdfStorageService.service';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-versions',
  templateUrl: './versions.component.html',
  styleUrls: ['./versions.component.scss']
})
export class VersionsComponent implements OnInit {

  isAnonymous = null;
  ownUsrId = null;
  currentUser: User;
  hasPermissions = null;
  newBokItem = '';
  newBoks = null;
  newBokKeys = [];

  constructor(
    public fileCS: FileCompareService,
    public fileUS: FileUploadServiceService,
    public afAuth: AngularFireAuth,
    private rdf: RdfStorageService) {
    this.afAuth.auth.onAuthStateChanged(user => {
      if (user && (user.uid === 'k3otaNhyTMYg0lvph0TP0EPE3pV2')) {
        this.isAnonymous = user.isAnonymous;
        this.ownUsrId = user.uid;
        this.hasPermissions = true;
        this.fileCS.manageCurrentVersions(this.fileUS.allBoKs);

      } else {
        this.isAnonymous = true;
        this.ownUsrId = null;
        this.hasPermissions = false;
      }
    });
  }

  ngOnInit() {
    this.loadNewBoks();
  }

  deleteVersionBoK() {
    this.fileCS.loading = true;
    this.afAuth.auth.currentUser.getIdToken(true).then((idToken) => {

      delete this.fileCS.allBoKs['current'];
      this.fileCS.allBoKs['current'] = this.fileCS.allBoKs[this.fileCS.listKeysAll[1]];
      delete this.fileCS.allBoKs[this.fileCS.listKeysAll[1]];

      this.fileUS.deleteCurrentVersion(this.fileCS.allBoKs, idToken).pipe(
        switchMap(() => { 
          return this.rdf.DeleteCurrentRDFVersion(this.fileUS.allBoKs); 
        })
      ).subscribe(
        () => {
          this.fileCS.manageCurrentVersions(this.fileCS.allBoKs);
          this.fileCS.loading = false;
        },
        error => {
          console.log(error)
          // TODO - create a visual element to indicate the error
        }

      );
    })
  }

  recoverFromBackup() {
    this.fileCS.loading = true;
    this.afAuth.auth.currentUser.getIdToken(true).then((idToken) => {
      this.fileUS.recoverFromBackup(idToken).pipe(
        switchMap(() => { 
          return this.rdf.RecoverFromBackup(this.fileUS.allBoKs); 
        })
      ).subscribe(
        () => {
          this.fileCS.manageCurrentVersions(this.fileUS.allBoKs);
          this.fileCS.loading = false;
        },
        error => {
          console.log(error)
          // TODO - create a visual element to indicate the error
        }
      );
    });
  }

  async replaceCurrentBok() {
    this.fileCS.loading = true;
    if (this.newBoks) {
      let selectedBok = this.newBokKeys[0];
      if (this.newBokItem && this.newBokItem !== '') {
        selectedBok = this.newBokItem;
      }
      this.afAuth.auth.currentUser.getIdToken(true).then((idToken) => {
        const newBoK = this.fileCS.convertExportJSON(this.newBoks[selectedBok]);
        this.fileUS.replaceCurrentBok(newBoK, idToken).pipe(
          switchMap(() => {return this.rdf.ReplaceRDFVersion(newBoK);})
        ).subscribe(
          () => {
          this.fileCS.manageCurrentVersions(this.fileUS.allBoKs);
          this.fileCS.loading = false;
        });
      });
    } else {
      await this.loadNewBoks();
      this.replaceCurrentBok();
    }
  }

  async loadNewBoks(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.fileCS.getNewBoK().subscribe({
        next: (newBoKExport) => {
          if (newBoKExport) {
            this.newBoks = newBoKExport;
            this.newBokKeys = Object.keys(newBoKExport);
          }
          resolve();
        },
        error: (err) => {
          reject(err);
        }
      });
    });
  }

}
