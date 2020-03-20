import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

const collection = 'Users';

export class User extends Object {

  public _id: string;
  public name: string;
  public email: string;
  public affiliation: string;
  public consortium: Boolean;

  constructor(public user: firebase.User = null) {
    super();
    if (user) {
      this._id = user.uid;
      this.email = user.email;
      this.name = user.displayName;
      this.affiliation = '';
      this.consortium = false;
      this.user = null;
    }
  }
}

@Injectable({
  providedIn: 'root'
})

export class UserService {

  private db: AngularFirestore;
  constructor(db: AngularFirestore) {
    this.db = db;
  }

  subscribeToUsers(): Observable<User[]> {
    return this.db.collection<User>(collection).valueChanges();
  }

  getUserById(userId: string): Observable<User> {
    return this.db
      .collection(collection)
      .doc<User>(userId)
      .valueChanges();
  }

  updateUserWithId(userId: string, updatedUser: User) {
    this.db
      .collection(collection)
      .doc<User>(userId)
      .update(updatedUser);
  }

  addNewUser(user: firebase.User) {
    const usr = new User(user);
    console.log('new user ' + usr);
    this.db.collection<User>(collection).doc(user.uid).set(usr);
  }

}
