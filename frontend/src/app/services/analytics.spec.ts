import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { AnalyticsService } from './analytics';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AnalyticsService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(AnalyticsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // getMonthlySpending tests
  it('getMonthlySpending() returns array from direct array response', () => {
    const mock = [{ month: 'Jan', income: 1000, expense: 400 }];

    service.getMonthlySpending().subscribe((res: any) => {
      expect(res).toEqual(mock);
    });

    const req = httpMock.expectOne('http://localhost:5000/analytics/spending/monthly');
    expect(req.request.method).toBe('GET');
    req.flush(mock);
  });

  it('getMonthlySpending() returns array from data wrapper', () => {
    const mock = [{ month: 'Feb', income: 2000, expense: 800 }];

    service.getMonthlySpending().subscribe((res: any) => {
      expect(res).toEqual(mock);
    });

    const req = httpMock.expectOne('http://localhost:5000/analytics/spending/monthly');
    req.flush({ data: mock });
  });

  it('getMonthlySpending() returns array from nested data wrapper', () => {
    const mock = [{ month: 'Mar', income: 1500, expense: 600 }];

    service.getMonthlySpending().subscribe((res: any) => {
      expect(res).toEqual(mock);
    });

    const req = httpMock.expectOne('http://localhost:5000/analytics/spending/monthly');
    req.flush({ data: { data: mock } });
  });

  it('getMonthlySpending() returns empty array for invalid response', () => {
    service.getMonthlySpending().subscribe((res: any) => {
      expect(res).toEqual([]);
    });

    const req = httpMock.expectOne('http://localhost:5000/analytics/spending/monthly');
    req.flush(null);
  });

  // getTopCategories tests
  it('getTopCategories() returns array from direct array response', () => {
    const mock = [{ category: 'Food', total: 200 }];

    service.getTopCategories().subscribe((res: any) => {
      expect(res).toEqual(mock);
    });

    const req = httpMock.expectOne('http://localhost:5000/analytics/top-categories');
    expect(req.request.method).toBe('GET');
    req.flush(mock);
  });

  it('getTopCategories() returns array from data wrapper', () => {
    const mock = [{ category: 'Transport', total: 150 }];

    service.getTopCategories().subscribe((res: any) => {
      expect(res).toEqual(mock);
    });

    const req = httpMock.expectOne('http://localhost:5000/analytics/top-categories');
    req.flush({ data: mock });
  });

  it('getTopCategories() returns empty array for invalid response', () => {
    service.getTopCategories().subscribe((res: any) => {
      expect(res).toEqual([]);
    });

    const req = httpMock.expectOne('http://localhost:5000/analytics/top-categories');
    req.flush({ invalid: true });
  });

  // getIncomeVsExpense tests
  it('getIncomeVsExpense() returns data from response', () => {
    const mock = { income: 1000, expense: 500 };

    service.getIncomeVsExpense().subscribe((res: any) => {
      expect(res).toEqual(mock);
    });

    const req = httpMock.expectOne('http://localhost:5000/analytics/income-vs-expense');
    expect(req.request.method).toBe('GET');
    req.flush({ data: mock });
  });

  it('getIncomeVsExpense() returns data directly when no wrapper', () => {
    const mock = { income: 2000, expense: 1000 };

    service.getIncomeVsExpense().subscribe((res: any) => {
      expect(res).toEqual(mock);
    });

    const req = httpMock.expectOne('http://localhost:5000/analytics/income-vs-expense');
    req.flush(mock);
  });

  // getPortfolioValue tests
  it('getPortfolioValue() GETs /analytics/portfolio-value', () => {
    const mock = { total_value: 5000 };

    service.getPortfolioValue().subscribe((res: any) => {
      expect(res).toEqual(mock);
    });

    const req = httpMock.expectOne('http://localhost:5000/analytics/portfolio-value');
    expect(req.request.method).toBe('GET');
    req.flush({ data: mock });
  });

  it('getPortfolioValue() returns data directly when no wrapper', () => {
    const mock = { total_value: 10000 };

    service.getPortfolioValue().subscribe((res: any) => {
      expect(res).toEqual(mock);
    });

    const req = httpMock.expectOne('http://localhost:5000/analytics/portfolio-value');
    req.flush(mock);
  });

  // getBudgetAnalysis tests
  it('getBudgetAnalysis() GETs /analytics/budgets/:month', () => {
    const mock = { month: '2025-04', used: 300, limit: 1000 };

    service.getBudgetAnalysis('2025-04').subscribe((res: any) => {
      expect(res).toEqual(mock);
    });

    const req = httpMock.expectOne('http://localhost:5000/analytics/budgets/2025-04');
    expect(req.request.method).toBe('GET');
    req.flush({ data: mock });
  });

  it('getBudgetAnalysis() returns data directly when no wrapper', () => {
    const mock = { month: '2025-05', used: 500, limit: 1000 };

    service.getBudgetAnalysis('2025-05').subscribe((res: any) => {
      expect(res).toEqual(mock);
    });

    const req = httpMock.expectOne('http://localhost:5000/analytics/budgets/2025-05');
    req.flush(mock);
  });

  it('getBudgetAnalysis() handles different month formats', () => {
    const mock = { month: '2026-01', used: 100, limit: 500 };

    service.getBudgetAnalysis('2026-01').subscribe((res: any) => {
      expect(res).toEqual(mock);
    });

    const req = httpMock.expectOne('http://localhost:5000/analytics/budgets/2026-01');
    req.flush({ data: mock });
  });

  it('getTopCategories() returns empty array for null response', () => {
    service.getTopCategories().subscribe((res: any) => {
      expect(res).toEqual([]);
    });

    const req = httpMock.expectOne('http://localhost:5000/analytics/top-categories');
    req.flush(null);
  });

  it('getTopCategories() returns array from nested data wrapper', () => {
    const mock = [{ category: 'Food', total: 300 }];

    service.getTopCategories().subscribe((res: any) => {
      expect(res).toEqual(mock);
    });

    const req = httpMock.expectOne('http://localhost:5000/analytics/top-categories');
    req.flush({ data: { data: mock } });
  });

  it('getIncomeVsExpense() returns null for null response', () => {
    service.getIncomeVsExpense().subscribe((res: any) => {
      expect(res).toBeNull();
    });

    const req = httpMock.expectOne('http://localhost:5000/analytics/income-vs-expense');
    req.flush(null);
  });

  it('getPortfolioValue() returns null for null response', () => {
    service.getPortfolioValue().subscribe((res: any) => {
      expect(res).toBeNull();
    });

    const req = httpMock.expectOne('http://localhost:5000/analytics/portfolio-value');
    req.flush(null);
  });
});