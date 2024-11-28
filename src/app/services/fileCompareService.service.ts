import { Injectable, NgZone } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { formatDate } from '@angular/common';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class FileCompareService {
    constructor(private http: HttpClient, private ngZone: NgZone) { }

    public URL_BASE = environment.URL_BASE;

    public URL_BASE_LTB_EXPORT = environment.URL_BASE_LTB_EXPORT;

    public URL_BACKUP = environment.URL_BACKUP;


    public loading = true;
    public hasError = false;

    public comparison = {
        current:
            { conceptsCount: 0, skillsCount: 0, relationsCount: 0, externalresCount: 0 },
        new:
            { conceptsCount: 0, skillsCount: 0, relationsCount: 0, externalresCount: 0, isolatedNodes: [], loopingRelations: [], duplicatedCodes: [] },
        removedConceptsIndex: [],
        addedConceptsIndex: [],
        noCodeConceptsIndex: [],
        oldConceptsIndex: [],
        changedConceptsIndex: []

    };

    public newBoK;
    public currentBoK;
    public listKeys = [];

    public allBoKs;
    public listKeysAll = [];
    public currentSelectedBoK = '';

    public resp = {};

    getNewBoK(): Observable<any> {
        // return this.http.get(this.URL_BASE_LTB_EXPORT + 'bok2.json');
        return this.http.get(this.URL_BASE_LTB_EXPORT + '.json');
    }

    getNewBoKConverted(): any {
        return this.newBoK;
    }

    getCurrentBoK(): Observable<any> {
        return this.http.get(this.URL_BASE + 'current.json');
    }

    getBackupBok(): Observable<any> {
        return this.http.get(this.URL_BACKUP + 'current.json');
    }

    getCurrentVersions(): Observable<any> {
        return this.http.get(this.URL_BASE + '.json');
    }

    discardBoKDraft() {
        this.loading = true;
        this.hasError = false;
        console.log(Object.keys(this.allBoKs));
        console.log(' Discarding : ')
        console.log(this.currentSelectedBoK);

        delete this.allBoKs[this.currentSelectedBoK];

        this.listKeys = Object.keys(this.allBoKs);

        console.log(Object.keys(this.allBoKs));
        console.log(this.allBoKs);

        const httpOptions = {
            headers: new HttpHeaders({
                'Content-Type': 'application/json'
            })
        };

        const currentFile = JSON.stringify(this.allBoKs);

        console.log(currentFile)

        const vUrl = this.URL_BASE_LTB_EXPORT + '.json';
        this.http.put(vUrl, currentFile, httpOptions).pipe(
            catchError(this.handleError)
        ).subscribe(
            res => {
                this.resp = res;
                console.log(this.resp);
                this.resetComparison();
                this.compareBoK();
            },
            err => this.resp = err,
        );


    }

    getBoKList() {
        return this.listKeys;
    }

    resetComparison() {
        this.loading = true;
        this.hasError = false;
        this.comparison = {
            current:
                { conceptsCount: 0, skillsCount: 0, relationsCount: 0, externalresCount: 0 },
            new:
                { conceptsCount: 0, skillsCount: 0, relationsCount: 0, externalresCount: 0, isolatedNodes: [], loopingRelations: [], duplicatedCodes: [] },
            removedConceptsIndex: [],
            addedConceptsIndex: [],
            noCodeConceptsIndex: [],
            oldConceptsIndex: [],
            changedConceptsIndex: []
        };
    }

    manageCurrentVersions(allBoks = null) {
        this.loading = true;
        console.log("MANAGE CURRENT VERSIONS CS")
        console.log(allBoks)
        if (allBoks) {
            this.allBoKs = allBoks;

            this.listKeysAll = Object.keys(allBoks);
            // To have the versions in chronological descending order
            this.listKeysAll.sort((a, b) => a.slice(1, a.length + 1).localeCompare(b.slice(1, a.length + 1), undefined, { numeric: true }))
            this.listKeysAll.reverse();

            this.ngZone.run(() => {
                this.loading = false;

            });
        } else {
            this.getCurrentVersions().subscribe((allBoK) => {
                this.allBoKs = allBoK;
                this.listKeysAll = Object.keys(allBoK);

                // To have the versions in chronological descending order
                this.listKeysAll.sort((a, b) => a.slice(1, a.length + 1).localeCompare(b.slice(1, a.length + 1), undefined, { numeric: true }))
                this.listKeysAll.reverse();

                this.ngZone.run(() => {
                    this.loading = false;

                });
            });
        }
    }

    compareBoK(bokItem = '') {
        console.log('comparing bok')
        this.loading = true;
        this.getNewBoK().subscribe((newBoKExport) => {

            this.getCurrentVersions().subscribe((currentBoK) => {

                this.currentBoK = currentBoK.current;

                this.comparison.current.conceptsCount = this.currentBoK.concepts ? this.currentBoK.concepts.length : 0;
                this.comparison.current.skillsCount = this.currentBoK.skills ? this.currentBoK.skills.length : 0;
                this.comparison.current.relationsCount = this.currentBoK.relations ? this.currentBoK.relations.length : 0;
                this.comparison.current.externalresCount = this.currentBoK.references ? this.currentBoK.references.length : 0;


                if (newBoKExport) {
                    console.log(newBoKExport)
                    this.allBoKs = newBoKExport;

                    this.listKeys = Object.keys(newBoKExport);

                    // By default show the first 
                    if (!bokItem) {
                        this.currentSelectedBoK = this.listKeys[0];
                    } else {
                        this.currentSelectedBoK = bokItem;
                    }
                    const newBoK = this.convertExportJSON(newBoKExport[this.currentSelectedBoK]);


                    if (!newBoK.Error) {
                        this.newBoK = newBoK;

                        this.comparison.new.conceptsCount = newBoK.concepts ? newBoK.concepts.length : 0;
                        this.comparison.new.skillsCount = newBoK.skills ? newBoK.skills.length : 0;
                        this.comparison.new.relationsCount = newBoK.relations ? newBoK.relations.length : 0;
                        this.comparison.new.externalresCount = newBoK.references ? newBoK.references.length : 0;

                        let allNewConcepts = new Map();
                        newBoK.concepts.forEach((concept, i) => {
                            if (allNewConcepts.has(concept.code) && concept.code != ' ' && concept.code != '') {
                                this.comparison.new.duplicatedCodes.push(concept.code);
                            }
                            allNewConcepts.set(concept.code, i);
                        });

                        let allCurrentConcepts = new Map();
                        this.currentBoK.concepts.forEach((concept, i) => {
                            allCurrentConcepts.set(concept.code, i);
                            if (!allNewConcepts.has(concept.code)) {
                                this.comparison.removedConceptsIndex.push(i);
                            }
                        });

                        allNewConcepts.forEach((i, c) => {
                            if (!allCurrentConcepts.has(c)) {
                                this.comparison.addedConceptsIndex.push(i);
                            } else if (this.compareConcept(this.newBoK.concepts[i], this.currentBoK.concepts[allCurrentConcepts.get(c)])){
                                this.comparison.changedConceptsIndex.push(i);
                            }
                            if (c == '' || c == ' ') {
                                this.comparison.noCodeConceptsIndex.push(i);
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

                        // Check if the newBok contains a concept code found in older versions of the BoK
                        const previousVersionsCodes = new Set();
                        for (let key in currentBoK) {
                            if (key !== 'current' && key != ("v" + this.currentBoK.version)) {
                                currentBoK[key].concepts.forEach(concept => previousVersionsCodes.add(concept.code));
                            }
                        }
                        this.currentBoK.concepts.forEach(concept => previousVersionsCodes.delete(concept.code));
                        this.comparison.addedConceptsIndex.forEach(index => {
                            let code = this.newBoK.concepts[index].code;
                            if (previousVersionsCodes.has(code)) {
                                this.comparison.oldConceptsIndex.push(index);
                            }
                        });

                        console.log(this.comparison)

                        this.ngZone.run(() => {
                            console.log('Finished loading comparison');
                            this.loading = false;
                            this.hasError = false;
                        });
                    } else {
                        this.ngZone.run(() => {
                            this.loading = false;
                            this.hasError = true;
                        });
                    }
                } else {
                    this.ngZone.run(() => {
                        this.loading = false;
                        this.hasError = true;
                    });
                }
            });
        });

    }

    compareConcept(obj1: any, obj2: any): boolean {
        const keys = Object.keys(obj2);
    
        for (let key of keys) {
            if (obj1[key] !== obj2[key]) return true;
        }
    
        return false;
    }

    convertExportJSON(obj: any): any {
        const fileToSave = { 'concepts': [], 'relations': [], 'references': [], 'skills': [], 'contributors': [] };
        let gistNode = 0;
        if (obj.hasOwnProperty('nodes')) {
        fileToSave.concepts[0] = {};
        Object.keys(obj['nodes']).forEach(k => {
            if (obj['nodes'][k].label === '[GIST] Geographic Information Science and Technology' && obj['nodes'][k].numberOfLinks > 0) {
            fileToSave.concepts[0] = {
                'code': obj['nodes'][k].label.split(']', 1)[0].split('[', 2)[1],
                'name': obj['nodes'][k].label.split(']')[1].trim(),
                'description': obj['nodes'][k].definition
            };
            gistNode = Number(k);
            } else {
            fileToSave.concepts.push({
                'code': (obj['nodes'][k].label.split(']', 1)[0].split('[', 2)[1] != null &&
                obj['nodes'][k].label.split(']', 1)[0].split('[', 2)[1].length > 0) ?
                obj['nodes'][k].label.split(']', 1)[0].split('[', 2)[1] : ' ',
                'name': (obj['nodes'][k].label.split(']')[1] != null && obj['nodes'][k].label.split(']')[1].length > 0) ?
                obj['nodes'][k].label.split(']')[1].trim() : ' ',
                'description': (obj['nodes'][k].definition != null && obj['nodes'][k].definition.length > 0) ?
                obj['nodes'][k].definition : ' ',
                'selfAssesment': (obj['nodes'][k].selfAssessment != null && obj['nodes'][k].selfAssessment.length > 0) ?
                obj['nodes'][k].selfAssessment : ' '
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
        if (obj.hasOwnProperty('externalResources')) {
        Object.keys(obj['externalResources']).forEach(k => {
            const nodeToAdd = [];
            if (obj['externalResources'][k].nodes && obj['externalResources'][k].nodes.length > 0) {
                obj['externalResources'][k].nodes.forEach(node => {
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
                    'name': obj['externalResources'][k].title.length > 0 ? obj['externalResources'][k].title : ' ',
                    'description': (obj['externalResources'][k].description && obj['externalResources'][k].description.length > 0) ? obj['externalResources'][k].description : ' ',
                    'url': (obj['externalResources'][k].url && obj['externalResources'][k].url.length > 0) ?
                    obj['externalResources'][k].url : ' '
                });
            }
        });
        } else {
        return { 'Error': 'Invalid Format in external_resources section' };
        }
        if (obj.hasOwnProperty('learningOutcomes')) {
            Object.keys(obj['learningOutcomes']).forEach(k => {
                const nodeToAdd = [];
                if (obj['learningOutcomes'][k].nodes && obj['learningOutcomes'][k].nodes.length > 0) {
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
        if (obj.hasOwnProperty('contributors')) {
            Object.keys(obj['contributors']).forEach(k => {
                const nodeToAdd = [];
                if (obj['contributors'][k].nodes && obj['contributors'][k].nodes.length > 0) {
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
                        'description': (obj['contributors'][k].description && obj['contributors'][k].description.length > 0) ? obj['contributors'][k].description : ' ',
                        'url': (obj['contributors'][k].url && obj['contributors'][k].url.length > 0) ?
                        obj['contributors'][k].url : ' '
                    });
                }
            });
        } else {
        return { 'Error': 'Invalid Format in contributors section' };
        }
        return fileToSave;
    }

    handleError(error: Error) {
        return throwError(error);
    }


}
