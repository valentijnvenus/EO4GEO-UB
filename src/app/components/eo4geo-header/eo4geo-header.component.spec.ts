import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { Eo4geoHeaderComponent } from './eo4geo-header.component';

describe('Eo4geoHeaderComponent', () => {
  let component: Eo4geoHeaderComponent;
  let fixture: ComponentFixture<Eo4geoHeaderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ Eo4geoHeaderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(Eo4geoHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
