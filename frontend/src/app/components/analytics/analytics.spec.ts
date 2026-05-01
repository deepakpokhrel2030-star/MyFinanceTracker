import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AnalyticsComponent } from './analytics';
import { AuthService } from '../../services/auth';

describe('AnalyticsComponent', () => {
  let component: AnalyticsComponent;
  let fixture: ComponentFixture<AnalyticsComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AnalyticsComponent],
      providers: [
        AuthService,
        provideHttpClient(withInterceptors([])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of({ get: () => null }) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AnalyticsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  function init() {
    fixture.detectChanges();
    tick(0);
    httpMock.expectOne(r => r.url.includes('/analytics/spending/monthly')).flush([]);
    httpMock.expectOne(r => r.url.includes('/analytics/top-categories')).flush([]);
    httpMock.expectOne(r => r.url.includes('/analytics/income-vs-expense')).flush({});
    httpMock.expectOne(r => r.url.includes('/analytics/portfolio-value')).flush({});
    httpMock.expectOne(r => r.url.includes('/savings-goals/')).flush([]);
    httpMock.match(r => r.url.includes('/analytics/budgets/')).forEach(r => r.flush({}));
    tick();
  }

  it('should create', fakeAsync(() => {
    init();
    expect(component).toBeTruthy();
  }));

  it('financialHealthScore is between 0 and 100', fakeAsync(() => {
    init();
    expect(component.financialHealthScore).toBeGreaterThanOrEqual(0);
    expect(component.financialHealthScore).toBeLessThanOrEqual(100);
  }));

  it('savingsRate returns 0 when no income', fakeAsync(() => {
    init();
    component.incomeVsExpense = { total_income: 0, total_expense: 0 };
    expect(component.savingsRate).toBe(0);
  }));

  it('budgetRiskLabel returns "No data" when no budget data', fakeAsync(() => {
    init();
    component.budgetAnalysis = null;
    expect(component.budgetRiskLabel).toBe('No data');
  }));

  it('netForMonth calculates income minus expense', fakeAsync(() => {
    init();
    expect(component.netForMonth({ income: 2000, expense: 1500 })).toBe(500);
  }));

  it('categoryShare returns 0 when totalCategorySpend is 0', fakeAsync(() => {
    init();
    component.topCategories = [];
    expect(component.categoryShare(100)).toBe(0);
  }));

  it('financialHealthLabel returns "Strong" for score >= 80', fakeAsync(() => {
    init();
    spyOnProperty(component, 'financialHealthScore').and.returnValue(85);
    expect(component.financialHealthLabel).toBe('Strong');
  }));

  it('financialHealthLabel returns "Stable" for score >= 60', fakeAsync(() => {
    init();
    spyOnProperty(component, 'financialHealthScore').and.returnValue(65);
    expect(component.financialHealthLabel).toBe('Stable');
  }));

  it('financialHealthLabel returns "At risk" for score < 40', fakeAsync(() => {
    init();
    spyOnProperty(component, 'financialHealthScore').and.returnValue(30);
    expect(component.financialHealthLabel).toBe('At risk');
  }));

  it('budgetRiskClass returns "risk-high" when over budget', fakeAsync(() => {
    init();
    component.budgetAnalysis = { total_limit: 100, total_spent: 110, items: [{ spent: 110, limit: 100 }] };
    expect(component.budgetRiskClass).toBe('risk-high');
  }));

  it('budgetRiskClass returns "risk-low" when usage < 75%', fakeAsync(() => {
    init();
    component.budgetAnalysis = { total_limit: 100, total_spent: 50, items: [] };
    expect(component.budgetRiskClass).toBe('risk-low');
  }));

  it('spendingRate returns 0 when total income is 0', fakeAsync(() => {
    init();
    component.incomeVsExpense = { total_income: 0, total_expense: 0 };
    expect(component.spendingRate).toBe(0);
  }));

  it('spendingRate calculates correctly', fakeAsync(() => {
    init();
    component.incomeVsExpense = { total_income: 2000, total_expense: 500 };
    expect(component.spendingRate).toBeCloseTo(25);
  }));

  it('insightMessage returns expense warning when net savings < 0', fakeAsync(() => {
    init();
    component.incomeVsExpense = { total_income: 500, total_expense: 700, net: -200 };
    expect(component.insightMessage).toBe('Expenses are currently higher than income.');
  }));

  it('netForMonth handles expenses field as fallback', fakeAsync(() => {
    init();
    expect(component.netForMonth({ income: 1000, expenses: 400 })).toBe(600);
  }));
});