import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { Eo4geoFooterComponent } from './eo4geo-footer.component';

describe('Eo4geoFooterComponent', () => {
  let component: Eo4geoFooterComponent;
  let fixture: ComponentFixture<Eo4geoFooterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ Eo4geoFooterComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(Eo4geoFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
