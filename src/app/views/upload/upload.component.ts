import { Component, OnInit, OnDestroy, Input, ViewChild, NgZone } from '@angular/core';
import { FileUploadServiceService } from '../../services/fileUploadService.service';
import { FileCompareService } from '../../services/fileCompareService.service';
import { ModalDirective } from 'ngx-bootstrap/modal';
import { AngularFireAuth } from '@angular/fire/auth';
import { User, UserService } from '../../services/user.service';
import { Organization, OrganizationService } from '../../services/organization.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss']
})
export class UploadComponent {

  public successUpload = true;
  isAnonymous = null;
  ownUsrId = null;
  currentUser: User;
  hasPermissions = null;
  public errorText = '';
  public errorUpload = true;
  @ViewChild('dangerModal') public dangerModal: ModalDirective;

  codeNameHash = {};

  bokSelected = '';

  constructor(
    private fileUploadService: FileUploadServiceService,
    public fileCS: FileCompareService,
    public afAuth: AngularFireAuth,
    private userService: UserService,
    private router: Router,
    private ngZone: NgZone) {
    this.fileCS.loading = true;
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

  ngAfterViewInit() {
    this.fileCS.loading = true;
    this.loadComparison();
    setTimeout(() => {
      console.log(this.fileCS.listKeys);
      this.bokSelected = this.fileCS.listKeys[0];
    }, 4000);

  }

  loadComparison() {
    this.fileCS.resetComparison();
    this.fileCS.compareBoK(this.bokSelected);
  }

  discardBoK() {
    this.fileCS.discardBoKDraft();
    setTimeout(() => {
      console.log(this.fileCS.listKeys);
      this.bokSelected = this.fileCS.listKeys[0];
    }, 5000);
  }

  publishBoK() {
    this.fileCS.loading = true;
    var newBok = this.fileCS.getNewBoKConverted();

    this.afAuth.auth.currentUser.getIdToken(true).then((idToken) => {
      this.fileUploadService.uploadNewBoK(newBok, idToken).subscribe(() => {
        this.ngZone.run(() => {
          this.router.navigateByUrl('managecurrent').then();
          this.fileCS.loading = false;
        });
      });

    });

  }

}
