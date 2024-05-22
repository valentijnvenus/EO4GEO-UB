import { Component, OnInit } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";
import { FileUploadServiceService } from "../../services/fileUploadService.service";
import { FileCompareService } from "../../services/fileCompareService.service";

@Component({
  selector: 'app-backup-state',
  templateUrl: './backupState.component.html'
})
export class BackupStateComponent implements OnInit {

  isAnonymous = null;
  ownUsrId = null;
  hasPermissions = null;

  constructor(private readonly afAuth: AngularFireAuth, private readonly fileUS: FileUploadServiceService, private readonly fileCS: FileCompareService) {}

  ngOnInit(): void {
    this.afAuth.auth.onAuthStateChanged(user => {
      if (user && (user.uid === 'k3otaNhyTMYg0lvph0TP0EPE3pV2')) {
        this.isAnonymous = user.isAnonymous;
        this.ownUsrId = user.uid;
        this.hasPermissions = true;
      } else {
        this.isAnonymous = true;
        this.ownUsrId = null;
        this.hasPermissions = false;
      }
    });
  }

  syncBackup(backupId: string): void {
    this.fileCS.loading = true;
    this.afAuth.auth.currentUser.getIdToken(true).then((idToken) => {
      this.fileUS.updateBackups(idToken, [backupId]).subscribe((value) => {
        if(value) {
          console.log('Funciona');
        } else {
          console.log('Falla');
        }
      });
    });
  }
  
}