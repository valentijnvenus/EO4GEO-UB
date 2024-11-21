import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";
import { FileUploadServiceService } from "../../services/fileUploadService.service";
import { FileCompareService } from "../../services/fileCompareService.service";
import { ReplicaState } from "../../model/replicaState";
import { BokData } from "../../model/bokData";
import { forkJoin, Observable } from "rxjs";
import { switchMap, tap } from "rxjs/operators";
import { ApiUpdateService } from "../../services/apiUpdateService.service";
import { RdfStorageService } from "../../services/rdfStorageService.service";

@Component({
  selector: 'app-current-version',
  templateUrl: './currentVersion.component.html'
})
export class CurrentVersionComponent implements OnInit {

  isAnonymous = null;
  ownUsrId = null;
  hasPermissions = null;
  isLoading = false;
  loaded = false;
  warningAlert = false;
  dangerAlert = false;
  replicasData: ReplicaState[] = [];
  currentBokData: BokData = new BokData();;
  backupBokData: BokData = new BokData();;
  apiVersion = "";
  rdfVersion = "";

  constructor(private readonly afAuth: AngularFireAuth, private readonly fileUS: FileUploadServiceService, 
              private readonly fileCS: FileCompareService, private readonly ref: ChangeDetectorRef,
              private readonly apiUpdateService: ApiUpdateService, private readonly rdf: RdfStorageService) {}

  ngOnInit(): void {
    this.afAuth.auth.onAuthStateChanged(user => {
      if (user && (user.uid === 'k3otaNhyTMYg0lvph0TP0EPE3pV2')) {
        this.isAnonymous = user.isAnonymous;
        this.ownUsrId = user.uid;
        this.hasPermissions = true;
        this.loadData();
      } else {
        this.isAnonymous = true;
        this.ownUsrId = null;
        this.hasPermissions = false;
      }
    });
  }
  
  loadData() {
    this.isLoading = true;  
    this.ref.detectChanges();

    setTimeout(() => {
        if (this.isLoading) this.showWarningAlert();
    }, 3000);
  
    this.afAuth.auth.currentUser.getIdToken(true).then((idToken) => {
      const backupsState$ = this.getReplicasState(idToken);
      const bokInfo$ = this.loadBokInfo();
      const apiVersion$ = this.apiUpdateService.getAPIVersion();
      const rdfVersion$ = this.rdf.GetRDFVersion();
  
      forkJoin([backupsState$, bokInfo$, apiVersion$, rdfVersion$]).subscribe(
        ([backupsState, bokInfo, apiVersion, rdfVersion]) => {
          this.apiVersion = apiVersion;
          this.rdfVersion = rdfVersion;
          this.isLoading = false;
          this.loaded = true;
          this.warningAlert = false;
          this.ref.detectChanges();
        },
        (error) => {
          this.isLoading = false;
          this.warningAlert = false;
          this.showDangerAlert();
          this.ref.detectChanges();
        }
      );
    });
  }
  
  getReplicasState(idToken: string): Observable<any> {
    return this.fileUS.getReplicasState(idToken).pipe(
      tap((data) => {
        this.replicasData = data.body;
      })
    );
  }
  
  loadBokInfo(): Observable<any> {
    const getCurrentBoK$ = this.fileCS.getCurrentBoK().pipe(
      tap((currentBoK) => {
        this.currentBokData.version = currentBoK.version ? currentBoK.version : "";
        this.currentBokData.updateDate = currentBoK.updateDate ? currentBoK.updateDate : "";
        this.currentBokData.conceptsCount = currentBoK.concepts ? currentBoK.concepts.length : 0;
        this.currentBokData.skillsCount = currentBoK.skills ? currentBoK.skills.length : 0;
        this.currentBokData.relationsCount = currentBoK.relations ? currentBoK.relations.length : 0;
        this.currentBokData.externalresCount = currentBoK.references ? currentBoK.references.length : 0;
      })
    );
  
    const getBackupBok$ = this.fileCS.getBackupBok().pipe(
      tap((backupBok) => {
        this.backupBokData.version = backupBok.version ? backupBok.version : "";
        this.backupBokData.updateDate = backupBok.updateDate ? backupBok.updateDate : "";
        this.backupBokData.conceptsCount = backupBok.concepts ? backupBok.concepts.length : 0;
        this.backupBokData.skillsCount = backupBok.skills ? backupBok.skills.length : 0;
        this.backupBokData.relationsCount = backupBok.relations ? backupBok.relations.length : 0;
        this.backupBokData.externalresCount = backupBok.references ? backupBok.references.length : 0;
      })
    );
  
    return forkJoin([getCurrentBoK$, getBackupBok$]);
  }

  syncReplica(replicaId: string) {
    this.isLoading = true;
    this.ref.detectChanges();
    this.afAuth.auth.currentUser.getIdToken(true).then((idToken) => {
      this.fileUS.updateReplicas(idToken, [replicaId]).subscribe(
        (data) => {
          this.replicasData.forEach((replica: ReplicaState) => {
            if(replica.project === replicaId) {
              replica.sync = true;
            }
          });
          this.isLoading = false;
          this.ref.detectChanges();
        },
        (error) => {
          this.isLoading = false;
          this.showDangerAlert();
          this.ref.detectChanges();
        }
      );
    });
  }

  updateBackup() {
    this.isLoading = true;
    this.ref.detectChanges();
    this.afAuth.auth.currentUser.getIdToken(true).then((idToken) => {
      this.fileUS.updateBackup(idToken).subscribe(
        (data) => {
          this.backupBokData = this.currentBokData;
          this.isLoading = false;
          this.ref.detectChanges();
        },
        (error) => {
          this.isLoading = false;
          this.showDangerAlert();
          this.ref.detectChanges();
        }
      );
    });
  }

  updateAPI() {
    this.isLoading = true;
    this.ref.detectChanges();
    this.afAuth.auth.currentUser.getIdToken(true).then((idToken) => {
      this.apiUpdateService.convertBoKAPIPreviousVersion(idToken).subscribe(
        (data) => {
          this.apiVersion = this.currentBokData.version;
          this.isLoading = false;
          this.ref.detectChanges();
        },
        (error) => {
          this.isLoading = false;
          this.showDangerAlert();
          this.ref.detectChanges();
        }
      );
    });
  }

  updateRDF() {
    this.isLoading = true;
    this.ref.detectChanges();
    this.fileUS.currentVersions().pipe(
      switchMap(bok => {
        return this.rdf.UpdateRDFVersion(bok)
      })
    ).subscribe(
      (data) => {
        this.rdfVersion = this.currentBokData.version;
        this.isLoading = false;
        this.ref.detectChanges();
      },
      (error) => {
        this.isLoading = false;
        this.showDangerAlert();
        this.ref.detectChanges();
      }
    );
  }

  getStatus(replica: ReplicaState
  ): string {
    if (replica.blocked) return 'Blocked';
    if (replica.sync) return 'Synchronized';
    return 'Desynchronized';
    
  }

  getColor(replica: ReplicaState): string {
    if (replica.blocked) return 'danger';
    if (replica.sync) return 'success';
    return 'warning'; 
  }

  getErrorMessage() {
    if (!this.loaded && !this.isLoading) return "Something went wrong while loading the data. Try again later."
    return "Something went wrong. Try again later."
  }

  showDangerAlert() {
    this.dangerAlert = true;
    this.ref.detectChanges();
  }

  showWarningAlert() {
    this.warningAlert = true;
    this.ref.detectChanges();
  }

  getLoadingMessage() {
    if(this.loaded) return "Updating data ..."
    return "Loading database state ..."
  }
  
}