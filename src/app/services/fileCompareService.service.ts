import { Injectable, NgZone } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { formatDate } from '@angular/common';

@Injectable({
    providedIn: 'root'
})
export class FileCompareService {
    constructor(private http: HttpClient, private ngZone: NgZone) { }

    public URL_BASE = 'https://ucgis-bok-default-rtdb.firebaseio.com/';
    public URL_BASE_BOKAPI = 'https://ucgis-api-default-rtdb.firebaseio.com/';
    public URL_BASE_BACKUP1 = 'https://ucgis-bok-backup-default-rtdb.firebaseio.com/';
    public URL_BASE_LTB_EXPORT = 'https://ucgis-bok-import-default-rtdb.firebaseio.com/';

    public loading = true;

    public comparison = {
        current:
            { conceptsCount: 0, skillsCount: 0, relationsCount: 0, externalresCount: 0 },
        new:
            { conceptsCount: 0, skillsCount: 0, relationsCount: 0, externalresCount: 0, isolatedNodes: [], loopingRelations: [] },
        removedConceptsIndex: [],
        addedConceptsIndex: [],
        changedConceptsIndex: []

    };

    public newBoK;
    public currentBoK;

    getNewBoK(): Observable<any> {
        return this.http.get(this.URL_BASE_LTB_EXPORT + 'bok2.json');
    }

    getCurrentBoK(): Observable<any> {
        return this.http.get(this.URL_BASE + 'current.json');
    }

    detectIsolatedNodes() {

    }

    compareBoK() {

        this.getNewBoK().subscribe((newBoKExport) => {
            const newBoK = this.convertExportJSON(newBoKExport);
            this.newBoK = newBoK;
            this.getCurrentBoK().subscribe((currentBoK) => {

                this.currentBoK = currentBoK;

                this.comparison.current.conceptsCount = currentBoK.concepts ? currentBoK.concepts.length : 0;
                this.comparison.current.skillsCount = currentBoK.skills ? currentBoK.skills.length : 0;
                this.comparison.current.relationsCount = currentBoK.relations ? currentBoK.relations.length : 0;
                this.comparison.current.externalresCount = currentBoK.references ? currentBoK.references.length : 0;

                this.comparison.new.conceptsCount = newBoK.concepts ? newBoK.concepts.length : 0;
                this.comparison.new.skillsCount = newBoK.skills ? newBoK.skills.length : 0;
                this.comparison.new.relationsCount = newBoK.relations ? newBoK.relations.length : 0;
                this.comparison.new.externalresCount = newBoK.references ? newBoK.references.length : 0;

                let allNewConcepts = [];
                newBoK.concepts.forEach(concept => {
                    allNewConcepts.push(concept.code);
                });

                let allCurrentConcepts = [];
                currentBoK.concepts.forEach(concept => {
                    allCurrentConcepts.push(concept.code);
                });

                allCurrentConcepts.forEach((c, i) => {
                    if (!allNewConcepts.includes(c)) {
                        this.comparison.removedConceptsIndex.push(i);
                    }
                });

                allNewConcepts.forEach((c, i) => {
                    if (!allCurrentConcepts.includes(c)) {
                        this.comparison.addedConceptsIndex.push(i);
                    }
                });

                newBoK.relations.forEach(rel => {

                    if (newBoK.concepts[rel.source] && newBoK.concepts[rel.target]) {
                        newBoK.concepts[rel.source].hasChildren = true;
                        newBoK.concepts[rel.target].hasParent = true;
                    } else {
                        console.log('relation to a concept that does not exist: ', rel.source, rel.target );
                    }
                    
                });

                newBoK.concepts.forEach(concept => {
                    if (!concept.hasParent && !concept.hasChildren){
                       this.comparison.new.isolatedNodes.push(concept);
                    }
                  
                });

                this.ngZone.run(() => {
                    console.log('Finished loading comparison');
                    this.loading = false;

                });
            });
        });

    }


    convertExportJSON(obj: any): any {
        const fileToSave = { 'concepts': [], 'relations': [], 'references': [], 'skills': [], 'contributors': [] };
        let gistNode = 0;
        if (obj.hasOwnProperty('nodes')) {
            Object.keys(obj['nodes']).forEach(k => {
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
            });
        } else {
            return { 'Error': 'Invalid Format in concepts section' };
        }
        if (obj.hasOwnProperty('links')) {
            obj['links'].forEach(k => {
              //  if (k.relationName == 'is subconcept of') {

                    // looping relation
                    if (k.target == k.source) {
                        this.comparison.new.loopingRelations.push(k)
                    } else {
                        // see isolated nodes

                        fileToSave.relations.push({
                            'target': k.target != null ? k.target : ' ',
                            'source': k.source != null ? k.source + 1 : ' ',
                            'name': 'is subconcept of'
                        });
                    }

              //  }
            });


/* 

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
            }); */
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
     /*    if (obj.hasOwnProperty('skills')) {
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
        } else { */
        if (obj.hasOwnProperty('learningOutcomes')) {
            Object.keys(obj['learningOutcomes']).forEach(k => {
                const nodeToAdd = [];
                if (obj['learningOutcomes'][k].nodes.length > 0) {
                    obj['learningOutcomes'][k].nodes.forEach(node => {
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
                        'name': obj['learningOutcomes'][k].name.length > 0 ? obj['learningOutcomes'][k].name : ' ',
                    });
                }
            });
        } else { 
            return { 'Error': 'Invalid Format in learning_outcomes section' };
        }
        /*         if (obj.hasOwnProperty('contributors')) {
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
                } */
        return fileToSave;
    }



}
