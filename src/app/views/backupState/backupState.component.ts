import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";
import { FileUploadServiceService } from "../../services/fileUploadService.service";
import { FileCompareService } from "../../services/fileCompareService.service";
import { BackupState } from "../../model/backupsState";

@Component({
  selector: 'app-backup-state',
  templateUrl: './backupState.component.html'
})
export class BackupStateComponent implements OnInit {

  isAnonymous = null;
  ownUsrId = null;
  hasPermissions = null;
  isLoading = false;
  loaded = false;
  alert = false;
  backupsData: BackupState[];

  constructor(private readonly afAuth: AngularFireAuth, private readonly fileUS: FileUploadServiceService, private readonly fileCS: FileCompareService, private readonly ref: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.afAuth.auth.onAuthStateChanged(user => {
      if (user && (user.uid === 'k3otaNhyTMYg0lvph0TP0EPE3pV2')) {
        this.isAnonymous = user.isAnonymous;
        this.ownUsrId = user.uid;
        this.hasPermissions = true;
        this.getBackupsState();
      } else {
        this.isAnonymous = true;
        this.ownUsrId = null;
        this.hasPermissions = false;
      }
    });
  }

  syncBackup(backupId: string) {
    this.isLoading = true;
    this.ref.detectChanges();
    this.afAuth.auth.currentUser.getIdToken(true).then((idToken) => {
      this.fileUS.updateBackups(idToken, [backupId]).subscribe(
        (data) => {
          this.backupsData.forEach((backup: BackupState) => {
            if(backup.project === backupId) {
              backup.sync = true;
            }
          });
          this.isLoading = false;
          this.ref.detectChanges();
        },
        (error) => {
          this.isLoading = false;
          this.showAlert();
          this.ref.detectChanges();
        }
      );
    });
  }

  getBackupsState() {
    this.isLoading = true;
    this.loaded = false;
    this.afAuth.auth.currentUser.getIdToken(true).then((idToken) => {
      this.fileUS.getBackupsState(idToken).subscribe(
        (data) => {
          this.backupsData = data.body;
          this.loaded = true;
          this.isLoading = false;
          this.ref.detectChanges();
        },
        (error) => {
          this.isLoading = false;
          this.showAlert();
          this.ref.detectChanges();
        },
      );
    });
  }

  getStatus(backup: BackupState): string {
    if (backup.blocked) return 'Blocked';
    if (backup.sync) return 'Synchronized';
    return 'Desynchronized';
    
  }

  getColor(backup: BackupState): string {
    if (backup.blocked) return 'danger';
    if (backup.sync) return 'success';
    return 'warning'; 
  }

  getErrorMessage() {
    if (!this.loaded && !this.isLoading) return "Something went wrong while loading the data. Try again later."
    return "Something went wrong while synchronizing the backup. Try again later."
  }

  showAlert() {
    this.alert = true;
    setTimeout(function(){
      this.alert = false;
    },3000);
  }

  getLoadingMessage() {
    if(this.loaded) return "Synchronizing backups ..."
    return "Loading backups state ..."
  }
  
}