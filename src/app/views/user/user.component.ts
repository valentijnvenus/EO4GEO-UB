import { Component, NgZone, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/auth';
import { User, UserService } from '../../services/user.service';

@Component({
  selector: 'app-user',
  templateUrl: 'user.component.html'
})
export class UserComponent implements OnInit {

  public msgSaved: string;
  public msgPwdRecover: string;
  public msgPwdRecoverError: string;

  public email: string;
  public affiliation: string;
  public name: string;

  public user: User;

  return = '';

  constructor(
    private afAuth: AngularFireAuth,
    private userService: UserService,
    private ngZone: NgZone,
    private router: Router
  ) {

    this.afAuth.auth.onAuthStateChanged(user => {
      if (user) {
        this.userService.getUserById(user.uid).subscribe(usr => {
          if (usr != null) {
            this.user = usr;
          } else {
            this.userService.addNewUser(user);
          }
        });
      }
    });
  }

  ngOnInit() {
  }

  recoverPwd() {

    const actionCodeSettings = {
      url: 'https://ucgis-tools-cdt.web.app/#/user', // the domain has to be added to firebase console whitelist
      handleCodeInApp: false
    };

    this.afAuth.auth.sendPasswordResetEmail(this.user.email, actionCodeSettings)
      .then(() => {
        // Password reset email sent.
        this.msgPwdRecover = 'Check your email to recover your password.';
      })
      .catch(error => {
        // Error occurred. Inspect error.code.
        // Handle Errors here.
        const errorCode = error.code;
        const errorMessage = error.message;
        this.msgPwdRecoverError = errorMessage;
        console.log(errorCode + ' - ' + errorMessage);
      });
  }

  save() {
    this.userService.updateUserWithId(this.user._id, this.user);
    this.msgSaved = 'Saved!';
  }

  logout() {
    this.afAuth.auth.signOut();
  }

}
