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
    public hasError = false;

    public comparison = {
        current:
            { conceptsCount: 0, skillsCount: 0, relationsCount: 0, externalresCount: 0 },
        new:
            { conceptsCount: 0, skillsCount: 0, relationsCount: 0, externalresCount: 0, isolatedNodes: [], loopingRelations: [], duplicatedCodes: [] },
        removedConceptsIndex: [],
        addedConceptsIndex: [],
        noCodeConceptsIndex: [],
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

    detectIsolatedNodes() {

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

            this.getCurrentBoK().subscribe((currentBoK) => {

                this.currentBoK = currentBoK;

                this.comparison.current.conceptsCount = currentBoK.concepts ? currentBoK.concepts.length : 0;
                this.comparison.current.skillsCount = currentBoK.skills ? currentBoK.skills.length : 0;
                this.comparison.current.relationsCount = currentBoK.relations ? currentBoK.relations.length : 0;
                this.comparison.current.externalresCount = currentBoK.references ? currentBoK.references.length : 0;


                if (newBoKExport) {
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

    convertExportJSON(obj: any): any {
        const fileToSave = { 'concepts': [], 'relations': [], 'references': [], 'skills': [], 'contributors': [], 'prior_knowledge': [], 'keywords': [], 'last_updated': null, 'date_created': null, 'date_published': null };
        fileToSave.last_updated = obj.lastUpdated ? obj.lastUpdated : '';
        fileToSave.date_created = obj.dateCreated ? obj.dateCreated : '';
        fileToSave.date_published = obj.datePublished ? obj.datePublished : '';
        if (obj.hasOwnProperty('nodes')) {
            obj['nodes'].forEach(k => {
                fileToSave.concepts.push({
                    'code': (k.label.split(']', 1)[0].split('[', 2)[1] != null &&
                        k.label.split(']', 1)[0].split('[', 2)[1].length > 0) ?
                        k.label.split(']', 1)[0].split('[', 2)[1] : ' ',
                    'name': (k.label.split(']')[1] != null && k.label.split(']')[1].length > 0) ?
                        k.label.split(']')[1].trim() : k.label != null ? k.label : ' ',
                    'description': (k.definition != null && k.definition.length > 0) ?
                        k.definition : ' ',
                    'selfAssesment': (k.selfAssessment != null && k.selfAssessment.length > 0) ?
                        k.selfAssessment : ' ',
                    'additionalResources': (k.additionalResources != null && k.additionalResources.length > 0) ?
                        k.additionalResources : ' ',
                    'explanation': (k.explanation != null && k.explanation.length > 0) ?
                        k.explanation : ' ',
                    'howTo': (k.howTo != null && k.howTo.length > 0) ?
                        k.howTo : ' ',
                    'imagePath': (k.imagePath != null && k.imagePath.length > 0) ?
                        k.imagePath : ' ',
                    'instance': (k.instance != null && k.instance.length > 0) ?
                        k.instance : false,
                    'introduction': (k.introduction != null && k.introduction.length > 0) ?
                        k.introduction : ' ',
                    'examples': (k.examples != null && k.examples.length > 0) ?
                        k.examples : ' ',
                    'link': (k.link != null && k.link.length > 0) ?
                        k.link : ' ',
                    'numberOfLinks': (k.numberOfLinks != null && k.numberOfLinks.length >= 0) ?
                        k.numberOfLinks : 0
                });
            });
        } else {
            return { 'Error': 'Invalid Format in concepts section' };
        }
        if (obj.hasOwnProperty('links')) {
            obj['links'].forEach(k => {
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
            });

        } else {
            return { 'Error': 'Invalid Format in relations section' };
        }
        if (obj.hasOwnProperty('externalResources')) {
            obj['externalResources'].forEach(k => {
                fileToSave.references.push({
                    'concepts': k.nodes.length > 0 ? k.nodes : [],
                    'name': k.title.length > 0 ? k.title : ' ',
                    'description': k.description.length > 0 ? k.description : ' ',
                    'url': (k.url !== null && k.url.length > 0) ? k.url : ' '
                });
            });

        } else {
            return { 'Error': 'Invalid Format in external_resources section' };
        }
        if (obj.hasOwnProperty('learningOutcomes')) {
            obj['learningOutcomes'].forEach(k => {
                fileToSave.skills.push({
                    'concepts': k.nodes.length > 0 ? k.nodes : [],
                    'name': k.name.length > 0 ? k.name : ' ',
                    'content': k.content.length > 0 ? k.content : ' ',
                    'number': k.number != null ? k.number : ' '
                });

            });

        } else {
            return { 'Error': 'Invalid Format in learning_outcomes section' };
        }
        if (obj.hasOwnProperty('priorKnowledge')) {
            obj['priorKnowledge'].forEach(k => {
                fileToSave.prior_knowledge.push({
                    'concepts': k.isPriorKnowledgeOf.length > 0 ? k.isPriorKnowledgeOf : [],
                    'target': k.node != null ? k.node : ' '
                });
            });
        }
        if (obj.hasOwnProperty('tags')) {
            obj['tags'].forEach(k => {
                fileToSave.keywords.push({
                    'concepts': k.nodes.length > 0 ? k.nodes : [],
                    'color': k.color != null ? k.color : '',
                    'name': k.name != null ? k.name : '',
                    'description': k.description != null ? k.description : ''
                });
            });
        }

        return fileToSave;
    }

    handleError(error: Error) {
        return throwError(error);
    }


}
