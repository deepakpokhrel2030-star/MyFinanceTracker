import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BudgetService } from './budget';

describe('BudgetService', () => {
  let service: BudgetService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BudgetService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(BudgetService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // getAll tests
  it('getAll() GETs /budgets/ and returns array', () => {
    const mockBudgets = [{ id: '1', category: 'food', limit: 300 }];
    service.getAll().subscribe(budgets => {
      expect(budgets.length).toBe(1);
      expect(budgets[0].category).toBe('food');
    });
    const req = httpMock.expectOne('http://localhost:5000/budgets/');
    expect(req.request.method).toBe('GET');
    req.flush({ budgets: mockBudgets });
  });

  it('getAll() handles items wrapper', () => {
    const mockBudgets = [{ id: '1', category: 'transport', limit: 200 }];
    service.getAll().subscribe(budgets => {
      expect(budgets.length).toBe(1);
      expect(budgets[0].category).toBe('transport');
    });
    const req = httpMock.expectOne('http://localhost:5000/budgets/');
    req.flush({ items: mockBudgets });
  });

  it('getAll() handles data.items wrapper', () => {
    const mockBudgets = [{ id: '1', category: 'entertainment', limit: 150 }];
    service.getAll().subscribe(budgets => {
      expect(budgets.length).toBe(1);
    });
    const req = httpMock.expectOne('http://localhost:5000/budgets/');
    req.flush({ data: { items: mockBudgets } });
  });

  it('getAll() handles direct data array', () => {
    const mockBudgets = [{ id: '1', category: 'shopping', limit: 250 }];
    service.getAll().subscribe(budgets => {
      expect(budgets.length).toBe(1);
      expect(budgets[0].category).toBe('shopping');
    });
    const req = httpMock.expectOne('http://localhost:5000/budgets/');
    req.flush(mockBudgets);
  });

  it('getAll() returns empty array for invalid response', () => {
    service.getAll().subscribe(budgets => {
      expect(budgets).toEqual([]);
    });
    const req = httpMock.expectOne('http://localhost:5000/budgets/');
    req.flush(null);
  });

  // getAll with filters tests
  it('getAll() passes filters as query params', () => {
    service.getAll({ month: '2025-01', category: 'food' }).subscribe();
    const req = httpMock.expectOne(r => r.url === 'http://localhost:5000/budgets/');
    expect(req.request.params.get('month')).toBe('2025-01');
    expect(req.request.params.get('category')).toBe('food');
    req.flush({ budgets: [] });
  });

  it('getAll() filters out null values', () => {
    service.getAll({ month: '2025-01', category: null }).subscribe();
    const req = httpMock.expectOne(r => r.url === 'http://localhost:5000/budgets/');
    expect(req.request.params.has('category')).toBe(false);
    req.flush({ budgets: [] });
  });

  it('getAll() filters out undefined values', () => {
    service.getAll({ month: '2025-01', category: undefined }).subscribe();
    const req = httpMock.expectOne(r => r.url === 'http://localhost:5000/budgets/');
    expect(req.request.params.has('category')).toBe(false);
    req.flush({ budgets: [] });
  });

  it('getAll() filters out empty string values', () => {
    service.getAll({ month: '2025-01', category: '' }).subscribe();
    const req = httpMock.expectOne(r => r.url === 'http://localhost:5000/budgets/');
    expect(req.request.params.has('category')).toBe(false);
    req.flush({ budgets: [] });
  });

  // create tests
  it('create() POSTs to /budgets/', () => {
    const data = { category: 'transport', limit: 150, month: '2025-01' };
    service.create(data).subscribe();
    const req = httpMock.expectOne('http://localhost:5000/budgets/');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('create() sends correct data payload', () => {
    const data = { category: 'food', limit: 300, month: '2025-02' };
    service.create(data).subscribe();
    const req = httpMock.expectOne('http://localhost:5000/budgets/');
    expect(req.request.body).toEqual(data);
    req.flush({});
  });

  // update tests
  it('update() PUTs to /budgets/:id', () => {
    service.update('1', { limit: 200 }).subscribe();
    const req = httpMock.expectOne('http://localhost:5000/budgets/1');
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('update() sends correct data payload', () => {
    const data = { category: 'food', limit: 400, month: '2025-03' };
    service.update('1', data).subscribe();
    const req = httpMock.expectOne('http://localhost:5000/budgets/1');
    expect(req.request.body).toEqual(data);
    req.flush({});
  });

  // delete tests
  it('delete() DELETEs /budgets/:id', () => {
    service.delete('1').subscribe();
    const req = httpMock.expectOne('http://localhost:5000/budgets/1');
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });
});