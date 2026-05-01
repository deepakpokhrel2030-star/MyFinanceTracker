import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { InvestmentService } from './investment';

describe('InvestmentService', () => {
  let service: InvestmentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        InvestmentService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(InvestmentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // getAll tests
  it('getAll() GETs /investments/ and returns array', () => {
    const mockInvestments = [{ id: '1', symbol: 'AAPL', type: 'stock' }];
    service.getAll().subscribe(investments => {
      expect(investments.length).toBe(1);
      expect(investments[0].symbol).toBe('AAPL');
    });
    const req = httpMock.expectOne('http://localhost:5000/investments/');
    req.flush({ investments: mockInvestments });
  });

  it('getAll() handles items wrapper', () => {
    const mockInvestments = [{ id: '1', symbol: 'GOOGL', type: 'stock' }];
    service.getAll().subscribe(investments => {
      expect(investments.length).toBe(1);
      expect(investments[0].symbol).toBe('GOOGL');
    });
    const req = httpMock.expectOne('http://localhost:5000/investments/');
    req.flush({ items: mockInvestments });
  });

  it('getAll() handles data.items wrapper', () => {
    const mockInvestments = [{ id: '1', symbol: 'MSFT', type: 'stock' }];
    service.getAll().subscribe(investments => {
      expect(investments.length).toBe(1);
    });
    const req = httpMock.expectOne('http://localhost:5000/investments/');
    req.flush({ data: { items: mockInvestments } });
  });

  it('getAll() handles direct data array', () => {
    const mockInvestments = [{ id: '1', symbol: 'AMZN', type: 'stock' }];
    service.getAll().subscribe(investments => {
      expect(investments.length).toBe(1);
      expect(investments[0].symbol).toBe('AMZN');
    });
    const req = httpMock.expectOne('http://localhost:5000/investments/');
    req.flush(mockInvestments);
  });

  it('getAll() returns empty array for invalid response', () => {
    service.getAll().subscribe(investments => {
      expect(investments).toEqual([]);
    });
    const req = httpMock.expectOne('http://localhost:5000/investments/');
    req.flush(null);
  });

  // getAll with filters tests
  it('getAll() passes filters as query params', () => {
    service.getAll({ type: 'stock', symbol: 'AAPL' }).subscribe();
    const req = httpMock.expectOne(r => r.url === 'http://localhost:5000/investments/');
    expect(req.request.params.get('type')).toBe('stock');
    expect(req.request.params.get('symbol')).toBe('AAPL');
    req.flush({ investments: [] });
  });

  it('getAll() filters out null values', () => {
    service.getAll({ type: 'stock', symbol: null }).subscribe();
    const req = httpMock.expectOne(r => r.url === 'http://localhost:5000/investments/');
    expect(req.request.params.has('symbol')).toBe(false);
    req.flush({ investments: [] });
  });

  it('getAll() filters out undefined values', () => {
    service.getAll({ type: undefined }).subscribe();
    const req = httpMock.expectOne(r => r.url === 'http://localhost:5000/investments/');
    expect(req.request.params.has('type')).toBe(false);
    req.flush({ investments: [] });
  });

  it('getAll() filters out empty string values', () => {
    service.getAll({ type: '', symbol: 'AAPL' }).subscribe();
    const req = httpMock.expectOne(r => r.url === 'http://localhost:5000/investments/');
    expect(req.request.params.has('type')).toBe(false);
    req.flush({ investments: [] });
  });

  // create tests
  it('create() POSTs to /investments/', () => {
    const data = { symbol: 'TSLA', type: 'stock', quantity: 5 };
    service.create(data).subscribe();
    const req = httpMock.expectOne('http://localhost:5000/investments/');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('create() sends correct data payload', () => {
    const data = { symbol: 'NVDA', type: 'stock', quantity: 10, current_price: 500 };
    service.create(data).subscribe();
    const req = httpMock.expectOne('http://localhost:5000/investments/');
    expect(req.request.body).toEqual(data);
    req.flush({});
  });

  // update tests
  it('update() PUTs to /investments/:id', () => {
    service.update('1', { current_price: 200 }).subscribe();
    const req = httpMock.expectOne('http://localhost:5000/investments/1');
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('update() sends correct data payload', () => {
    const data = { symbol: 'AAPL', quantity: 20, current_price: 150 };
    service.update('1', data).subscribe();
    const req = httpMock.expectOne('http://localhost:5000/investments/1');
    expect(req.request.body).toEqual(data);
    req.flush({});
  });

  // delete tests
  it('delete() DELETEs /investments/:id', () => {
    service.delete('1').subscribe();
    const req = httpMock.expectOne('http://localhost:5000/investments/1');
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });
});