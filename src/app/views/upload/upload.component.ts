import { Component, OnInit, OnDestroy, Input, ViewChild } from '@angular/core';
import { FileUploadServiceService } from '../../services/fileUploadService.service';
import { ModalDirective } from 'ngx-bootstrap/modal';
import { AngularFireAuth } from '@angular/fire/auth';
import { catchError } from "rxjs/operators";

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss']
})
export class UploadComponent {

  public successUpload = true;
  isAnonymous = null;
  ownUsrId = null;
  public errorUpload = true;

  @ViewChild('dangerModal') public dangerModal: ModalDirective;

  constructor(private fileUploadService: FileUploadServiceService, public afAuth: AngularFireAuth) {
    this.afAuth.auth.onAuthStateChanged(user => {
      console.log(user);
      if (user) {
        this.isAnonymous = user.isAnonymous;
        this.ownUsrId = user.uid;
      } else {
        this.isAnonymous = true;
        this.ownUsrId = null;
      }
    });
  }

  uploadFile( jsonInput: any) {
    const file: File = jsonInput.target.files[0];
    let fileReader = new FileReader();
    let fileService = this.fileUploadService;
    fileReader.onload = (e) => {
      this.afAuth.auth.currentUser.getIdToken( true).then((idToken) => {
        try {
          fileService.uploadFile(fileReader.result, idToken);
          this.successUpload = false;
          this.errorUpload = true;
        }
       catch{
         this.errorUpload = false;
         this.successUpload = true;
       }
      });
    }
    fileReader.readAsText(file);
  }
}
