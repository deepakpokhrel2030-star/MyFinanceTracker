import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { DashboardComponent } from './dashboard';
import { AuthService } from '../../services/auth';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            currentUser$: new BehaviorSubject<any>({ name: 'Test User' }),
            logout: jasmine.createSpy('logout'),
            isAdmin: jasmine.createSpy('isAdmin').and.returnValue(false)
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function init() {
    fixture.detectChanges();
    tick(0);
    httpMock.expectOne(r => r.url.includes('/accounts/')).flush({ accounts: [] });
    httpMock.expectOne(r => r.url.includes('/analytics/income-vs-expense')).flush({ total_income: 0, total_expense: 0, net: 0, monthly: [] });
    httpMock.expectOne(r => r.url.includes('/analytics/spending/monthly')).flush([]);
    httpMock.expectOne(r => r.url.includes('/analytics/top-categories')).flush([]);
    httpMock.expectOne(r => r.url.includes('/analytics/portfolio-value')).flush({ total_value: 0, total_pl: 0 });
    tick();
  }

  it('should create', fakeAsync(() => {
    init();
    expect(component).toBeTruthy();
  }));

  it('totalBalance starts at 0', fakeAsync(() => {
    init();
    expect(component.totalBalance).toBe(0);
  }));

  it('savingsRate returns 0 when no income', fakeAsync(() => {
    init();
    component.incomeVsExpense = { total_income: 0, total_expense: 0, net: 0 };
    expect(component.savingsRate).toBe(0);
  }));

  it('sumMonthlyIncome totals monthly income', fakeAsync(() => {
    init();
    expect(component.sumMonthlyIncome([{ income: 100 }, { income: 200 }])).toBe(300);
  }));

  it('sumMonthlyExpenses totals monthly expenses', fakeAsync(() => {
    init();
    expect(component.sumMonthlyExpenses([{ expense: 50 }, { expenses: 70 }])).toBe(120);
  }));

  it('totalIncome reads from incomeVsExpense', fakeAsync(() => {
    init();
    component.incomeVsExpense = { total_income: 3000 };
    expect(component.totalIncome).toBe(3000);
  }));

  it('totalExpense reads from incomeVsExpense', fakeAsync(() => {
    init();
    component.incomeVsExpense = { total_expense: 1200 };
    expect(component.totalExpense).toBe(1200);
  }));

  it('netCashflow = totalIncome - totalExpense', fakeAsync(() => {
    init();
    component.incomeVsExpense = { total_income: 3000, total_expense: 1200 };
    expect(component.netCashflow).toBe(1800);
  }));

  it('monthLabel formats month/year correctly', fakeAsync(() => {
    init();
    expect(component.monthLabel({ month: 4, year: 2026 })).toBe('04/26');
  }));

  it('barHeight returns minimum 8 for zero values', fakeAsync(() => {
    init();
    expect(component.barHeight(0)).toBe(8);
  }));

  it('totalBalance sums all account balances', fakeAsync(() => {
    init();
    component.accounts = [{ balance: 500 }, { balance: 300 }, { balance: -100 }];
    expect(component.totalBalance).toBe(700);
  }));
});