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
            { conceptsCount: 0, skillsCount: 0, relationsCount: 0, externalresCount: 0, isolatedNodes: [], loopingRelations: [], duplicatedCodes: [] },
        removedConceptsIndex: [],
        addedConceptsIndex: [],
        changedConceptsIndex: []

    };

    public newBoK;
    public currentBoK;
    public listKeys = [];

    getNewBoK(): Observable<any> {
        // return this.http.get(this.URL_BASE_LTB_EXPORT + 'bok2.json');
        return this.http.get(this.URL_BASE_LTB_EXPORT + '.json');
    }

    getCurrentBoK(): Observable<any> {
        return this.http.get(this.URL_BASE + 'current.json');
    }

    detectIsolatedNodes() {

    }

    getBoKList() {
        return this.listKeys;
    }

    resetComparison() {
        this.loading = true;
        this.comparison = {
            current:
                { conceptsCount: 0, skillsCount: 0, relationsCount: 0, externalresCount: 0 },
            new:
                { conceptsCount: 0, skillsCount: 0, relationsCount: 0, externalresCount: 0, isolatedNodes: [], loopingRelations: [], duplicatedCodes: [] },
            removedConceptsIndex: [],
            addedConceptsIndex: [],
            changedConceptsIndex: []

        };
    }

    compareBoK(bokItem = '') {
        this.getNewBoK().subscribe((newBoKExport) => {

            this.listKeys = Object.keys(newBoKExport);
            // By default show the first 
            if (!bokItem) {
                bokItem = this.listKeys[0];
            }
            const newBoK = this.convertExportJSON(newBoKExport[bokItem]);
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
                    if (allNewConcepts.includes(concept.code) && concept.code != ' ' && concept.code != '') {
                        this.comparison.new.duplicatedCodes.push(concept.code);
                    }
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
                    if (newBoK.concepts[rel.source] && newBoK.concepts[rel.target] && rel.name == 'is subconcept of') {
                        newBoK.concepts[rel.source].hasChildren = true;
                        newBoK.concepts[rel.target].hasParent = true;
                    } else if (!newBoK.concepts[rel.source] || !newBoK.concepts[rel.target]) {
                        console.log('relation to a concept that does not exist: ', rel.source, rel.target);
                    }

                });

                newBoK.concepts.forEach(concept => {
                    if (!concept.hasParent && !concept.hasChildren) {
                        this.comparison.new.isolatedNodes.push(concept);
                    }
                });



                /*                const httpOptions = {
                                    headers: new HttpHeaders({
                                        'Content-Type': 'application/json'
                                    })
                                };
                                const fileToSave = JSON.stringify(newBoK);
                    
                                const configUrl = this.URL_BASE_BACKUP1 + 'currentNEW.json';
                               
                                this.http.put(configUrl, fileToSave, httpOptions).pipe().subscribe();  */



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
                        obj['nodes'][k].label.split(']')[1].trim() : obj['nodes'][k].label != null ? obj['nodes'][k].label : ' ',
                    'description': (obj['nodes'][k].definition != null && obj['nodes'][k].definition.length > 0) ?
                        obj['nodes'][k].definition : ' ',
                    'selfAssesment': (obj['nodes'][k].selfAssessment != null && obj['nodes'][k].selfAssessment.length > 0) ?
                        obj['nodes'][k].selfAssessment : ' ',
                    'additionalResources': (obj['nodes'][k].additionalResources != null && obj['nodes'][k].additionalResources.length > 0) ?
                        obj['nodes'][k].additionalResources : ' ',
                    'explanation': (obj['nodes'][k].explanation != null && obj['nodes'][k].explanation.length > 0) ?
                        obj['nodes'][k].explanation : ' ',
                    'howTo': (obj['nodes'][k].howTo != null && obj['nodes'][k].howTo.length > 0) ?
                        obj['nodes'][k].howTo : ' ',
                    'imagePath': (obj['nodes'][k].imagePath != null && obj['nodes'][k].imagePath.length > 0) ?
                        obj['nodes'][k].imagePath : ' ',
                    'instance': (obj['nodes'][k].instance != null && obj['nodes'][k].instance.length > 0) ?
                        obj['nodes'][k].instance : false,
                    'introduction': (obj['nodes'][k].introduction != null && obj['nodes'][k].introduction.length > 0) ?
                        obj['nodes'][k].introduction : ' ',
                    'link': (obj['nodes'][k].link != null && obj['nodes'][k].link.length > 0) ?
                        obj['nodes'][k].link : ' ',
                    'numberOfLinks': (obj['nodes'][k].numberOfLinks != null && obj['nodes'][k].numberOfLinks.length > 0) ?
                        obj['nodes'][k].numberOfLinks : 0,
                });
            });
        } else {
            return { 'Error': 'Invalid Format in concepts section' };
        }
        if (obj.hasOwnProperty('links')) {
            obj['links'].forEach(k => {
                //     if (k.relationName == 'is subconcept of') {
                // looping relation
                if (k.target == k.source) {
                    this.comparison.new.loopingRelations.push(k);
                } else {

                    fileToSave.relations.push({
                        'target': k.target != null ? k.target : ' ',
                        'source': k.source != null ? k.source : ' ',
                        'name': k.relationName
                    });
                }

                /*   } else if (k.relationName == 'is related to') {
    
                  } */
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
                        nodeToAdd.push(node);
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
