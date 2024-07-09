import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

// Import Containers
import { DefaultLayoutComponent } from './containers';

import { P404Component } from './views/error/404.component';
import { P500Component } from './views/error/500.component';
import { LoginComponent } from './views/login/login.component';

import { UploadComponent } from './views/upload/upload.component';
import { VersionsComponent } from './views/versions/versions.component';

import { AngularFireAuthGuard } from '@angular/fire/auth-guard';
import { UserComponent } from './views/user/user.component';
import { CurrentVersionComponent } from './views/currentVersion/currentVersion.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'managenew',
    pathMatch: 'full'
  },
  {
    path: '404',
    component: P404Component,
    data: {
      title: 'Page 404'
    }
  },
  {
    path: '500',
    component: P500Component,
    data: {
      title: 'Page 500'
    }
  },
  {
    path: 'login',
    component: LoginComponent,
    data: {
      title: 'Login Page'
    }
  },
  {
    path: '',
    component: DefaultLayoutComponent,
    data: {
      title: 'BVMT'
    },
    children: [
      {
        path: 'managenew',
        data: {
          title: 'BoK Version Management Tool'
        },
        component: UploadComponent
      },
      {
        path: 'manageversion',
        data: {
          title: 'BoK Version Management Tool'
        },
        component: VersionsComponent
      },
      {
        path: 'managecurrent',
        data: {
          title: 'BoK Version Management Tool'
        },
        component: CurrentVersionComponent
      },
      {
        path: 'user',
        data: {
          title: 'User Details'
        },
        component: UserComponent
      }
    ]
  },
  { path: '**', component: P404Component }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
