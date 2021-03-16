import { Component, OnInit, OnDestroy, Input, ViewChild } from '@angular/core';
import { FileUploadServiceService } from '../../services/fileUploadService.service';
import { ModalDirective } from 'ngx-bootstrap/modal';
import { AngularFireAuth } from '@angular/fire/auth';
import { User, UserService } from '../../services/user.service';
import { Organization, OrganizationService } from '../../services/organization.service';

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

  BOK_BASE_URI = 'http://bok.eo4geo.eu/';

  constructor(private fileUploadService: FileUploadServiceService, public afAuth: AngularFireAuth, private userService: UserService,
    private organizationService: OrganizationService) {
    this.afAuth.auth.onAuthStateChanged(user => {
      if (user) {
        this.userService.getUserById(user.uid).subscribe(userDB => {
          this.currentUser = new User(userDB);
          if (this.currentUser.organizations && this.currentUser.organizations.length > 0) {
            this.currentUser.organizations.forEach(orgId => {
              this.organizationService.getOrganizationById(orgId).subscribe(org => {
                if (org.name === 'EO4GEO') {
                  this.hasPermissions = true;
                }
              });
            });
          }
        });
        this.isAnonymous = user.isAnonymous;
        this.ownUsrId = user.uid;
        this.hasPermissions = true;
      } else {
        this.isAnonymous = true;
        this.ownUsrId = null;
      }
    });

    // Only first time to load all existing versions

    //this.convertBoKAPIPreviousVersion();

  }

  uploadFile(jsonInput: any) {
    try {
      const file: File = jsonInput.target.files[0];
      const fileReader = new FileReader();
      const fileService = this.fileUploadService;
      if (file.type === 'application/json') {
        fileReader.onload = (e) => {
          this.afAuth.auth.currentUser.getIdToken(true).then((idToken) => {
            let newFile = this.convertFile(fileReader.result);
            newFile = this.cleanIsolatedNodes(newFile);
            const newFileBoKAPI = this.convertFileBoKAPI(newFile);
            if (!(newFile.hasOwnProperty('Error'))) {
              console.log(newFile);
              fileService.uploadFile(newFile, idToken);
              this.errorUpload = true;
              this.successUpload = false;
            } else {
              this.errorText = newFile['Error'];
              this.errorUpload = false;
              this.successUpload = true;
            }
          });
        };
        fileReader.readAsText(file);
      } else {
        this.errorText = 'The format is not valid, it is only accepted .json files';
        this.errorUpload = false;
        this.successUpload = true;
      }
    } catch (e) {
      this.errorUpload = false;
      this.successUpload = true;
      this.errorText = e;
    }
  }
  convertFile(file: any): any {
    const fileToSave = { 'concepts': [], 'relations': [], 'references': [], 'skills': [], 'contributors': [] };
    const obj = JSON.parse(file);
    let gistNode = 0;
    if (obj.hasOwnProperty('nodes')) {
      fileToSave.concepts[0] = {};
      Object.keys(obj['nodes']).forEach(k => {
        if (obj['nodes'][k].label === '[GIST] Geographic Information Science and Technology' && obj['nodes'][k].numberOfLinks > 0) {
          fileToSave.concepts[0] = {
            'code': obj['nodes'][k].label.split(']', 1)[0].split('[', 2)[1],
            'name': obj['nodes'][k].label.split(']')[1].trim(),
            'description': obj['nodes'][k].description
          };
          gistNode = Number(k);
        } else {
          fileToSave.concepts.push({
            'code': (obj['nodes'][k].label.split(']', 1)[0].split('[', 2)[1] != null &&
              obj['nodes'][k].label.split(']', 1)[0].split('[', 2)[1].length > 0) ?
              obj['nodes'][k].label.split(']', 1)[0].split('[', 2)[1] : ' ',
            'name': (obj['nodes'][k].label.split(']')[1] != null && obj['nodes'][k].label.split(']')[1].length > 0) ?
              obj['nodes'][k].label.split(']')[1].trim() : ' ',
            'description': (obj['nodes'][k].description != null && obj['nodes'][k].description.length > 0) ?
              obj['nodes'][k].description : ' ',
            'selfAssesment': (obj['nodes'][k].status != null && obj['nodes'][k].status.length > 0) ?
              obj['nodes'][k].status : ' '
          });
        }
      });
    } else {
      return { 'Error': 'Invalid Format in concepts section' };
    }
    if (obj.hasOwnProperty('links')) {
      Object.keys(obj['links']).forEach(k => {
        if (obj['links'][k].target === gistNode && obj['links'][k].source <= gistNode) {
          fileToSave.relations.push({
            'target': 0,
            'source': obj['links'][k].source != null ? obj['links'][k].source + 1 : ' ',
            'name': (obj['links'][k].relationName != null && obj['links'][k].relationName.length > 0) ? obj['links'][k].relationName : ' '
          });
        } else if (obj['links'][k].source === gistNode && obj['links'][k].target <= gistNode) {
          fileToSave.relations.push({
            'target': obj['links'][k].target != null ? obj['links'][k].target + 1 : ' ',
            'source': 0,
            'name': (obj['links'][k].relationName != null && obj['links'][k].relationName.length > 0) ? obj['links'][k].relationName : ' '
          });
        } else if (obj['links'][k].target === gistNode && obj['links'][k].source > gistNode) {
          fileToSave.relations.push({
            'target': 0,
            'source': obj['links'][k].source != null ? obj['links'][k].source : ' ',
            'name': (obj['links'][k].relationName != null && obj['links'][k].relationName.length > 0) ? obj['links'][k].relationName : ' '
          });
        } else if (obj['links'][k].source === gistNode && obj['links'][k].target > gistNode) {
          fileToSave.relations.push({
            'target': obj['links'][k].target != null ? obj['links'][k].target : ' ',
            'source': 0,
            'name': (obj['links'][k].relationName != null && obj['links'][k].relationName.length > 0) ? obj['links'][k].relationName : ' '
          });
        } else if (obj['links'][k].source <= gistNode && obj['links'][k].target > gistNode) {
          fileToSave.relations.push({
            'target': obj['links'][k].target != null ? obj['links'][k].target : ' ',
            'source': obj['links'][k].source != null ? obj['links'][k].source + 1 : ' ',
            'name': (obj['links'][k].relationName != null && obj['links'][k].relationName.length > 0) ? obj['links'][k].relationName : ' '
          });
        } else if (obj['links'][k].target <= gistNode && obj['links'][k].source > gistNode) {
          fileToSave.relations.push({
            'target': obj['links'][k].target != null ? obj['links'][k].target + 1 : ' ',
            'source': obj['links'][k].source != null ? obj['links'][k].source : ' ',
            'name': (obj['links'][k].relationName != null && obj['links'][k].relationName.length > 0) ? obj['links'][k].relationName : ' '
          });
        } else if (obj['links'][k].source <= gistNode && obj['links'][k].target <= gistNode) {
          fileToSave.relations.push({
            'target': obj['links'][k].target != null ? obj['links'][k].target + 1 : ' ',
            'source': obj['links'][k].source != null ? obj['links'][k].source + 1 : ' ',
            'name': (obj['links'][k].relationName != null && obj['links'][k].relationName.length > 0) ? obj['links'][k].relationName : ' '
          });
        } else {
          fileToSave.relations.push({
            'target': obj['links'][k].target != null ? obj['links'][k].target : ' ',
            'source': obj['links'][k].source != null ? obj['links'][k].source : ' ',
            'name': (obj['links'][k].relationName != null && obj['links'][k].relationName.length > 0) ? obj['links'][k].relationName : ' '
          });
        }
      });
    } else {
      return { 'Error': 'Invalid Format in relations section' };
    }
    if (obj.hasOwnProperty('external_resources')) {
      Object.keys(obj['external_resources']).forEach(k => {
        const nodeToAdd = [];
        if (obj['external_resources'][k].nodes.length > 0) {
          obj['external_resources'][k].nodes.forEach(node => {
            if (node < gistNode) {
              nodeToAdd.push(node + 1);
            } else if (node === gistNode) {
              nodeToAdd.push(0);
            } else {
              nodeToAdd.push(node);
            }
          });
          fileToSave.references.push({
            'concepts': nodeToAdd.length > 0 ? nodeToAdd : ' ',
            'name': obj['external_resources'][k].title.length > 0 ? obj['external_resources'][k].title : ' ',
            'description': obj['external_resources'][k].description.length > 0 ? obj['external_resources'][k].description : ' ',
            'url': (obj['external_resources'][k].url !== null && obj['external_resources'][k].url.length > 0) ?
              obj['external_resources'][k].url : ' '
          });
        }
      });
    } else {
      return { 'Error': 'Invalid Format in external_resources section' };
    }
    if (obj.hasOwnProperty('skills')) {
      Object.keys(obj['skills']).forEach(k => {
        const nodeToAdd = [];
        if (obj['skills'][k].nodes.length > 0) {
          obj['skills'][k].nodes.forEach(node => {
            if (node < gistNode) {
              nodeToAdd.push(node + 1);
            } else if (node === gistNode) {
              nodeToAdd.push(0);
            } else {
              nodeToAdd.push(node);
            }
          });
          fileToSave.skills.push({
            'concepts': nodeToAdd.length > 0 ? nodeToAdd : ' ',
            'name': obj['skills'][k].name.length > 0 ? obj['skills'][k].name : ' ',
          });
        }
      });
    } else {
      return { 'Error': 'Invalid Format in learning_outcomes section' };
    }
    if (obj.hasOwnProperty('contributors')) {
      Object.keys(obj['contributors']).forEach(k => {
        const nodeToAdd = [];
        if (obj['contributors'][k].nodes.length > 0) {
          obj['contributors'][k].nodes.forEach(node => {
            if (node < gistNode) {
              nodeToAdd.push(node + 1);
            } else if (node === gistNode) {
              nodeToAdd.push(0);
            } else {
              nodeToAdd.push(node);
            }
          });
          fileToSave.contributors.push({
            'concepts': nodeToAdd.length > 0 ? nodeToAdd : ' ',
            'name': obj['contributors'][k].name.length > 0 ? obj['contributors'][k].name : ' ',
            'description': obj['contributors'][k].description.length > 0 ? obj['contributors'][k].description : ' ',
            'url': (obj['contributors'][k].url !== null && obj['contributors'][k].url.length > 0) ?
              obj['contributors'][k].url : ' '
          });
        }
      });
    } else {
      return { 'Error': 'Invalid Format in contributors section' };
    }
    return fileToSave;
  }

  convertBoKAPIPreviousVersion() {
    this.fileUploadService.fullBoK().subscribe((fullBoK) => {

      const allV = Object.keys(fullBoK);

      allV.forEach(v => {
        // codeNameHash = {};
        const fileToSave = this.convertFileBoKAPI(fullBoK[v]);
        this.fileUploadService.uploadBoKAPIFile(v, fileToSave);
      });
    });

  }


  convertFileBoKAPI(version: any): any {

    const codeNameHash = {};

    const fileToSave = { 'concepts': {}, 'relations': [], 'references': [], 'skills': [], 'contributors': [] };

    fileToSave['updateDate'] = version.updateDate;
    fileToSave['version'] = version.version;

    fileToSave.concepts['GIST'] = {
      name: 'Geographic Information Science and Technology',
      id: 'GIST',
      uri: this.BOK_BASE_URI + 'GIST',
      relations: [],
      references: [],
      skills: [],
      contributors: []
    };
    codeNameHash[0] = 'GIST';

    version.concepts.forEach((c, k) => {
      if (c.code && c.code !== '') {
        fileToSave.concepts[c.code] = {
          name: c.name,
          id: c.code,
          uri: this.BOK_BASE_URI + c.code,
          relations: [],
          references: [],
          skills: [],
          contributors: []
        };
      }
      codeNameHash[k] = c.code;
    });

    if (version.references) {
      version.references.forEach(r => {
        fileToSave.references.push({
          name: r.name,
          url: r.url,
          description: r.description,
          concepts: []
        });

        r.concepts.forEach(c => {
          if (codeNameHash[c] && codeNameHash[c] !== '') {
            fileToSave.concepts[codeNameHash[c]].references.push({
              url: r.url,
              description: r.description,
              name: r.name
            });
            fileToSave.references[fileToSave.references.length - 1].concepts.push(codeNameHash[c]);
          }
        });
      });
    }

    if (version.contributors) {
      version.contributors.forEach(r => {
        fileToSave.contributors.push({
          name: r.name,
          url: r.url,
          description: r.description,
          concepts: []
        });

        r.concepts.forEach(c => {
          if (codeNameHash[c] && codeNameHash[c] !== '') {
            fileToSave.concepts[codeNameHash[c]].contributors.push({
              url: r.url,
              description: r.description,
              name: r.name
            });
            fileToSave.contributors[fileToSave.contributors.length - 1].concepts.push(codeNameHash[c]);
          }
        });
      });
    }
    if (version.skills) {
      version.skills.forEach(r => {
        fileToSave.skills.push({
          name: r.name,
          concepts: []
        });

        r.concepts.forEach(c => {
          if (codeNameHash[c] && codeNameHash[c] !== '') {
            fileToSave.concepts[codeNameHash[c]].skills.push(r.name);
            fileToSave.skills[fileToSave.skills.length - 1].concepts.push(codeNameHash[c]);
          }
        });
      });
    }
    if (version.relations) {
      version.relations.forEach(r => {

        if (codeNameHash[r.source] && codeNameHash[r.target]){
          fileToSave.relations.push({
            name: r.name,
            source: codeNameHash[r.source],
            target: codeNameHash[r.target]
          });
          fileToSave.concepts[codeNameHash[r.source]].relations.push({
            name: r.name,
            source: codeNameHash[r.source],
            target: codeNameHash[r.target]
          });
          fileToSave.concepts[codeNameHash[r.target]].relations.push({
            name: r.name,
            source: codeNameHash[r.source],
            target: codeNameHash[r.target]
          });
        } else {
          console.log('fail source ' + r.source)
          console.log('fail target ' + r.target)
        }
       
      });
    }
    return fileToSave;
  }

  cleanIsolatedNodes(bok) {
    const concepts = bok.concepts;
    for (let code of Object.keys(concepts)) {
      let hasRelation = false;

      let isGISTChildren = null;
      bok.relations.forEach( node => {
        const target = node.target;
        const source = node.source;
        if ( source == code && node.name == 'is subconcept of' ) {
          isGISTChildren = this.hasGISTConnection(target, bok, concepts[source]);
          if ( isGISTChildren  !== null ) {
            hasRelation = true;
          }
        }
      });
      if ( !hasRelation && code !== '0') {
        bok.concepts[code].code = ' ';
        bok.concepts[code].description = ' ';
        bok.concepts[code].name = ' ';
        bok.concepts[code].selfAssesment = ' ';
      }
      hasRelation = false;
    }
    return bok;
  }
  hasGISTConnection ( nodeId, bok, originalNode ) {
    if ( nodeId === 0) {
      return 'hasParent';
    } else {
      bok.relations.forEach( node => {
        const target = node.target;
        const source = node.source;
        if ( source == nodeId && node.name == 'is subconcept of') {
          return this.hasGISTConnection(target, bok, originalNode);
        }
      });
    }
  }
}
