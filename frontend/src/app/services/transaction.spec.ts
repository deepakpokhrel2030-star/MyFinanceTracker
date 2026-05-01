import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TransactionService } from './transaction';

describe('TransactionService', () => {
  let service: TransactionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TransactionService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(TransactionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // getAll tests - array response with pagination
  it('getAll() returns paginated object from array response', () => {
    const mockItems = Array.from({ length: 15 }, (_, i) => ({ id: String(i), amount: -10 }));
    service.getAll({ page: 1, limit: 6 }).subscribe(res => {
      expect(res.items.length).toBe(6);
      expect(res.total).toBe(15);
      expect(res.pages).toBe(3);
    });
    const req = httpMock.expectOne(r => r.url === 'http://localhost:5000/transactions/');
    req.flush(mockItems);
  });

  it('getAll() returns correct page from array response', () => {
    const mockItems = Array.from({ length: 20 }, (_, i) => ({ id: String(i), amount: i }));
    service.getAll({ page: 2, limit: 5 }).subscribe(res => {
      expect(res.items.length).toBe(5);
      expect(res.items[0].id).toBe('5');
      expect(res.page).toBe(2);
      expect(res.pages).toBe(4);
    });
    const req = httpMock.expectOne(r => r.url === 'http://localhost:5000/transactions/');
    req.flush(mockItems);
  });

  it('getAll() handles last page with fewer items', () => {
    const mockItems = Array.from({ length: 13 }, (_, i) => ({ id: String(i), amount: i }));
    service.getAll({ page: 3, limit: 5 }).subscribe(res => {
      expect(res.items.length).toBe(3);
      expect(res.page).toBe(3);
      expect(res.pages).toBe(3);
    });
    const req = httpMock.expectOne(r => r.url === 'http://localhost:5000/transactions/');
    req.flush(mockItems);
  });

  // getAll tests - object response
  it('getAll() returns paginated object from object response', () => {
    service.getAll({ page: 1, limit: 6 }).subscribe(res => {
      expect(res.items.length).toBe(2);
      expect(res.total).toBe(2);
    });
    const req = httpMock.expectOne(r => r.url === 'http://localhost:5000/transactions/');
    req.flush({ items: [{ id: '1' }, { id: '2' }], total: 2, page: 1, pages: 1 });
  });

  it('getAll() handles transactions wrapper', () => {
    service.getAll().subscribe(res => {
      expect(res.items.length).toBe(2);
    });
    const req = httpMock.expectOne(r => r.url === 'http://localhost:5000/transactions/');
    req.flush({ transactions: [{ id: '1' }, { id: '2' }] });
  });

  it('getAll() handles data.items wrapper', () => {
    service.getAll().subscribe(res => {
      expect(res.items.length).toBe(2);
    });
    const req = httpMock.expectOne(r => r.url === 'http://localhost:5000/transactions/');
    req.flush({ data: { items: [{ id: '1' }, { id: '2' }] } });
  });

  it('getAll() handles direct data array', () => {
    service.getAll().subscribe(res => {
      expect(res.items.length).toBe(3);
    });
    const req = httpMock.expectOne(r => r.url === 'http://localhost:5000/transactions/');
    req.flush([{ id: '1' }, { id: '2' }, { id: '3' }]);
  });

  it('getAll() calculates pages from total and limit', () => {
    service.getAll({ page: 1, limit: 10 }).subscribe(res => {
      expect(res.total).toBe(50);
      expect(res.pages).toBe(5);
    });
    const req = httpMock.expectOne(r => r.url === 'http://localhost:5000/transactions/');
    req.flush({ items: [], total: 50 });
  });

  // getAll with filters tests
  it('getAll() passes filters as query params', () => {
    service.getAll({ page: 1, limit: 10, account_id: 'acc1', type: 'expense' }).subscribe();
    const req = httpMock.expectOne(r => r.url === 'http://localhost:5000/transactions/');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.get('account_id')).toBe('acc1');
    expect(req.request.params.get('type')).toBe('expense');
    req.flush([]);
  });

  it('getAll() filters out null values', () => {
    service.getAll({ page: 1, account_id: null }).subscribe();
    const req = httpMock.expectOne(r => r.url === 'http://localhost:5000/transactions/');
    expect(req.request.params.has('account_id')).toBe(false);
    req.flush([]);
  });

  it('getAll() filters out undefined values', () => {
    service.getAll({ page: undefined, limit: 10 }).subscribe();
    const req = httpMock.expectOne(r => r.url === 'http://localhost:5000/transactions/');
    expect(req.request.params.has('page')).toBe(false);
    req.flush([]);
  });

  it('getAll() filters out empty string values', () => {
    service.getAll({ page: 1, account_id: '' }).subscribe();
    const req = httpMock.expectOne(r => r.url === 'http://localhost:5000/transactions/');
    expect(req.request.params.has('account_id')).toBe(false);
    req.flush([]);
  });

  // create tests
  it('create() POSTs to /transactions/', () => {
    const data = { account_id: 'acc1', amount: -50, type: 'expense' };
    service.create(data).subscribe();
    const req = httpMock.expectOne('http://localhost:5000/transactions/');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('create() sends correct data payload', () => {
    const data = { account_id: 'acc2', amount: 100, type: 'income', description: 'Salary' };
    service.create(data).subscribe();
    const req = httpMock.expectOne('http://localhost:5000/transactions/');
    expect(req.request.body).toEqual(data);
    req.flush({});
  });

  // update tests
  it('update() PUTs to /transactions/:id', () => {
    service.update('99', { amount: -60 }).subscribe();
    const req = httpMock.expectOne('http://localhost:5000/transactions/99');
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('update() sends correct data payload', () => {
    const data = { account_id: 'acc1', amount: -75, type: 'expense', description: 'Updated' };
    service.update('99', data).subscribe();
    const req = httpMock.expectOne('http://localhost:5000/transactions/99');
    expect(req.request.body).toEqual(data);
    req.flush({});
  });

  it('getAll() returns empty result for null response', () => {
    service.getAll().subscribe(res => {
      expect(res.items).toEqual([]);
      expect(res.total).toBe(0);
    });
    const req = httpMock.expectOne(r => r.url === 'http://localhost:5000/transactions/');
    req.flush(null);
  });

  it('getAll() uses count as total fallback', () => {
    service.getAll().subscribe(res => {
      expect(res.total).toBe(42);
    });
    const req = httpMock.expectOne(r => r.url === 'http://localhost:5000/transactions/');
    req.flush({ items: [], count: 42 });
  });

  it('getAll() uses total_pages as pages fallback', () => {
    service.getAll().subscribe(res => {
      expect(res.pages).toBe(7);
    });
    const req = httpMock.expectOne(r => r.url === 'http://localhost:5000/transactions/');
    req.flush({ items: [], total: 70, total_pages: 7 });
  });

  // delete tests
  it('delete() DELETEs /transactions/:id', () => {
    service.delete('99').subscribe();
    const req = httpMock.expectOne('http://localhost:5000/transactions/99');
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });
});