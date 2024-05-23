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
  backupsData: BackupState[];

  constructor(private readonly afAuth: AngularFireAuth, private readonly fileUS: FileUploadServiceService, private readonly fileCS: FileCompareService, private readonly ref: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.isLoading = true;
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

  syncBackup(backupId: string): void {
    this.isLoading = true;
    this.afAuth.auth.currentUser.getIdToken(true).then((idToken) => {
      this.fileUS.updateBackups(idToken, [backupId]).subscribe(
        (data) => {
          this.isLoading = false;
        },
        (error) => {
          this.isLoading = false;
        }
      );
    });
  }

  getBackupsState() {
    this.isLoading = true;
    this.afAuth.auth.currentUser.getIdToken(true).then((idToken) => {
      this.fileUS.getBackupsState(idToken).subscribe(
        (data) => {
          this.isLoading = false;
          this.loaded = true;
          this.backupsData = data.body;
          this.ref.detectChanges();
        },
        (error) => {
          this.isLoading = false;
          this.ref.detectChanges();
        },
      );
    });
  }

  getStatus(backup: BackupState): string {
    if (backup.blocked) {
      return 'Blocked';
    } else if (backup.sync) {
      return 'Updated';
    } else {
      return 'Outdated';
    }
  }

  getColor(backup: BackupState): string {
    if (backup.blocked) {
      return 'danger';
    } else if (backup.sync) {
      return 'success';
    } else {
      return 'warning';
    }
  }
  
}