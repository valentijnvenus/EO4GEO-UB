import { Component, OnDestroy, Inject, NgZone } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { navItems } from '../../_nav';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './default-layout.component.html'
})
export class DefaultLayoutComponent implements OnDestroy {
  public navItems = navItems;
  public sidebarMinimized = true;
  private changes: MutationObserver;
  public element: HTMLElement;
  public username: string;
  isAnonymous = true;

  constructor(
    private afAuth: AngularFireAuth,
    private ngZone: NgZone,
    private router: Router,
    @Inject(DOCUMENT) _document?: any) {

    this.changes = new MutationObserver((mutations) => {
      this.sidebarMinimized = _document.body.classList.contains('sidebar-minimized');
    });
    this.element = _document.body;
    this.changes.observe(<Element>this.element, {
      attributes: true,
      attributeFilter: ['class']
    });
    this.afAuth.auth.onAuthStateChanged(user => {
      if (user) {
        // User is signed in.
        this.username = user.email;
        this.isAnonymous = this.afAuth.auth.currentUser.isAnonymous;
      }
    });
    this.afAuth.authState.subscribe( user => {
      if (user) {
        // User is signed in.
        this.username = user.email;
        this.isAnonymous = this.afAuth.auth.currentUser.isAnonymous;
      }
    });
  }

  ngOnDestroy(): void {
    this.changes.disconnect();
  }

  logOut() {
    this.afAuth.auth.signOut();
    this.ngZone.run(() => this.router.navigateByUrl('/login')).then();
  }
}
