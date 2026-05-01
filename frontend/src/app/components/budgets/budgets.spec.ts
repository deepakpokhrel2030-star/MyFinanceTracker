import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { BudgetsComponent } from './budgets';

describe('BudgetsComponent', () => {
  let component: BudgetsComponent;
  let fixture: ComponentFixture<BudgetsComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BudgetsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BudgetsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function init() {
    fixture.detectChanges();
    tick(0);
    httpMock.expectOne(r => r.url === 'http://localhost:5000/budgets/').flush({ budgets: [] });
    tick();
  }

  it('should create', fakeAsync(() => {
    init();
    expect(component).toBeTruthy();
  }));

  it('starts in list mode', fakeAsync(() => {
    init();
    expect(component.mode).toBe('list');
  }));

  it('totalBudget sums all budget limits', fakeAsync(() => {
    init();
    component.budgets = [{ limit: 200 }, { limit: 300 }];
    expect(component.totalBudget).toBe(500);
  }));

  it('averageBudget returns 0 when no budgets', fakeAsync(() => {
    init();
    component.budgets = [];
    expect(component.averageBudget).toBe(0);
  }));

  it('createBudget() sets error if category is empty', fakeAsync(() => {
    init();
    component.form.category = '';
    component.createBudget();
    expect(component.error).toBe('Please select a category');
  }));

  it('createBudget() sets error if limit is 0', fakeAsync(() => {
    init();
    component.form.category = 'food';
    component.form.limit = 0;
    component.createBudget();
    expect(component.error).toBe('Budget limit must be greater than 0');
  }));

  it('getBudgetIcon returns correct icon for food', fakeAsync(() => {
    init();
    expect(component.getBudgetIcon('food')).toBe('bi-basket');
  }));

  it('pagedBudgets respects pageSize', fakeAsync(() => {
    init();
    component.budgets = Array.from({ length: 10 }, (_, i) => ({ id: i, limit: 100 }));
    component.currentPage = 1;
    expect(component.pagedBudgets.length).toBe(6);
  }));

  it('createBudget() successful POST', fakeAsync(() => {
    init();
    component.form = {
      category: 'transport',
      limit: 150,
      month: '2026-05'
    };
    component.createBudget();
    const req = httpMock.expectOne('http://localhost:5000/budgets/');
    expect(req.request.method).toBe('POST');
    req.flush({});
    httpMock.expectOne(r => r.url === 'http://localhost:5000/budgets/').flush({ budgets: [] });
    tick();
    expect(component.success).toBe('Budget created successfully');
    expect(component.mode).toBe('list');
  }));

  it('updateBudget() successful PUT', fakeAsync(() => {
    init();
    component.selectedBudget = { id: 'b1' };
    component.editForm = {
      category: 'food',
      limit: 250,
      month: '2026-05'
    };
    component.updateBudget();
    const req = httpMock.expectOne('http://localhost:5000/budgets/b1');
    expect(req.request.method).toBe('PUT');
    req.flush({});
    tick();
    expect(component.success).toBe('Budget updated successfully');
    expect(component.mode).toBe('detail');
  }));

  it('deleteBudget() successful DELETE', fakeAsync(() => {
    init();
    spyOn(window, 'confirm').and.returnValue(true);
    const budget = { id: 'b1', category: 'food' };
    component.deleteBudget(budget);
    const req = httpMock.expectOne('http://localhost:5000/budgets/b1');
    expect(req.request.method).toBe('DELETE');
    req.flush({});
    httpMock.expectOne(r => r.url === 'http://localhost:5000/budgets/').flush({ budgets: [] });
    tick();
    expect(component.success).toBe('Budget deleted successfully');
  }));

  it('deleteBudget() does nothing if user cancels confirm', fakeAsync(() => {
    init();
    spyOn(window, 'confirm').and.returnValue(false);
    component.deleteBudget({ id: 'b1', category: 'food' });
    httpMock.expectNone('http://localhost:5000/budgets/b1');
    expect(component.success).toBe('');
  }));

  it('nextPage() increments page', fakeAsync(() => {
    init();
    component.budgets = Array.from({ length: 10 }, (_, i) => ({ id: i, limit: 100 }));
    component.currentPage = 1;
    component.nextPage();
    expect(component.currentPage).toBe(2);
  }));

  it('prevPage() decrements page', fakeAsync(() => {
    init();
    component.currentPage = 2;
    component.prevPage();
    expect(component.currentPage).toBe(1);
  }));

  it('prevPage() does not go below 1', fakeAsync(() => {
    init();
    component.currentPage = 1;
    component.prevPage();
    expect(component.currentPage).toBe(1);
  }));

  it('highestBudget returns budget with greatest limit', fakeAsync(() => {
    init();
    component.budgets = [{ category: 'food', limit: 200 }, { category: 'rent', limit: 800 }];
    expect(component.highestBudget?.category).toBe('rent');
  }));

  it('averageBudget calculates correctly', fakeAsync(() => {
    init();
    component.budgets = [{ limit: 100 }, { limit: 300 }];
    expect(component.averageBudget).toBe(200);
  }));

  it('updateBudget() sets error if category is empty', fakeAsync(() => {
    init();
    component.selectedBudget = { id: 'b1' };
    component.editForm.category = '';
    component.updateBudget();
    expect(component.error).toBe('Please select a category');
  }));
});