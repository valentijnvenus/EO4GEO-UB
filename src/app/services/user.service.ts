import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

const collection = 'Users';

export class User extends Object {

  public _id: string;
  public name: string;
  public email: string;
  public organizations: string[];

  constructor(public user = null) {
    super();
    if (user) {
      this._id = user.uid != null ? user.uid : user._id != null ? user._id : '';
      this.email = user.email != null ? user.email : '';
      this.name = user.displayName != null ? user.displayName : user.name != null ? user.name : '';
      this.organizations = user.organizations != null ? user.organizations : [];
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

  getUserByEmail(userEmail: string): Observable<any[]> {
    return this.db.collection('Users', ref => ref.where('email', '==', userEmail)).valueChanges();
  }

  updateUserWithId(userId: string, updatedUser: User) {
    this.db
      .collection(collection)
      .doc<User>(userId)
      .update(updatedUser);
  }

  addNewUser(user: firebase.User) {
    const usr = new User(user);
    this.db.collection<User>(collection).doc(user.uid).set(usr);
  }


}
