import { Component, NgZone, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { FileCompareService } from '../../services/fileCompareService.service';
import { FileUploadServiceService } from '../../services/fileUploadService.service';
import { User, UserService } from '../../services/user.service';

@Component({
  selector: 'app-current',
  templateUrl: './current.component.html',
  styleUrls: ['./current.component.scss']
})
export class CurrentComponent implements OnInit {

  isAnonymous = null;
  ownUsrId = null;
  currentUser: User;
  hasPermissions = null;

  constructor(
    public fileCS: FileCompareService,
    public fileUS: FileUploadServiceService,
    public afAuth: AngularFireAuth,
    private ngZone: NgZone) {
    this.afAuth.auth.onAuthStateChanged(user => {
      if (user && (user.uid === 'k3otaNhyTMYg0lvph0TP0EPE3pV2')) {
        this.isAnonymous = user.isAnonymous;
        this.ownUsrId = user.uid;
        this.hasPermissions = true;
        console.log("MANAGE CURRENT VERSIONS from constructor")
        //  console.log(this.fileUS.allBoKs)
        this.fileCS.manageCurrentVersions(this.fileUS.allBoKs);

      } else {
        this.isAnonymous = true;
        this.ownUsrId = null;
        this.hasPermissions = false;
      }
    });
  }
  ngOnInit() {
  }

  deleteVersionBoK() {
    this.fileCS.loading = true;
    this.afAuth.auth.currentUser.getIdToken(true).then((idToken) => {

      delete this.fileCS.allBoKs['current'];
      this.fileCS.allBoKs['current'] = this.fileCS.allBoKs[this.fileCS.listKeysAll[1]];
      delete this.fileCS.allBoKs[this.fileCS.listKeysAll[1]];

      var res = this.fileUS.deleteCurrentVersion(this.fileCS.allBoKs, idToken);

      this.fileCS.manageCurrentVersions(this.fileCS.allBoKs);
      this.fileCS.loading = false;
    })
  }

  recoverFromBackup() {
    this.fileCS.loading = true;
    this.afAuth.auth.currentUser.getIdToken(true).then((idToken) => {
      this.fileUS.recoverFromBackup(idToken);
      setTimeout(() => {
        console.log("this.fileUs.allBoKs")
        console.log(this.fileUS.allBoKs)
        this.fileCS.manageCurrentVersions(this.fileUS.allBoKs);
      }, 1000);
    });
  }


}
