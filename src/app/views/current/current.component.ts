import { Component, OnInit } from '@angular/core';
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
    private userService: UserService) {
    this.afAuth.auth.onAuthStateChanged(user => {
      if (user && (user.uid === 'zdDeVbNrfJZIv71BnI4YthkqSzT2' || user.uid === '7QFB2A7OI8d9zrRdGFQ9B8WADkC2')) {
        this.isAnonymous = user.isAnonymous;
        this.ownUsrId = user.uid;
        this.hasPermissions = true;
        console.log("MANAGE CURRENT VERSIONS")
        console.log(this.fileUS.allBoKs)
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

  deleteVersionBoK () {
    
  }

  allBoKs

}
