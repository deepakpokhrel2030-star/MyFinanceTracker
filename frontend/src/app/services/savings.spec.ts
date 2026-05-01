import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SavingsService } from './savings';

describe('SavingsService', () => {
  let service: SavingsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SavingsService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(SavingsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // getAll tests
  it('getAll() GETs /savings-goals/ and returns goals array', () => {
    const mockGoals = [{ id: '1', name: 'Holiday', target_amount: 2000 }];
    service.getAll().subscribe(goals => {
      expect(goals.length).toBe(1);
      expect(goals[0].name).toBe('Holiday');
    });
    const req = httpMock.expectOne('http://localhost:5000/savings-goals/');
    req.flush({ goals: mockGoals });
  });

  it('getAll() handles savings wrapper', () => {
    const mockGoals = [{ id: '1', name: 'Car', target_amount: 10000 }];
    service.getAll().subscribe(goals => {
      expect(goals.length).toBe(1);
      expect(goals[0].name).toBe('Car');
    });
    const req = httpMock.expectOne('http://localhost:5000/savings-goals/');
    req.flush({ savings: mockGoals });
  });

  it('getAll() handles items wrapper', () => {
    const mockGoals = [{ id: '1', name: 'House', target_amount: 50000 }];
    service.getAll().subscribe(goals => {
      expect(goals.length).toBe(1);
      expect(goals[0].name).toBe('House');
    });
    const req = httpMock.expectOne('http://localhost:5000/savings-goals/');
    req.flush({ items: mockGoals });
  });

  it('getAll() handles data.items wrapper', () => {
    const mockGoals = [{ id: '1', name: 'Education', target_amount: 15000 }];
    service.getAll().subscribe(goals => {
      expect(goals.length).toBe(1);
    });
    const req = httpMock.expectOne('http://localhost:5000/savings-goals/');
    req.flush({ data: { items: mockGoals } });
  });

  it('getAll() handles direct data array', () => {
    const mockGoals = [{ id: '1', name: 'Emergency', target_amount: 5000 }];
    service.getAll().subscribe(goals => {
      expect(goals.length).toBe(1);
      expect(goals[0].name).toBe('Emergency');
    });
    const req = httpMock.expectOne('http://localhost:5000/savings-goals/');
    req.flush(mockGoals);
  });

  it('getAll() returns empty array for invalid response', () => {
    service.getAll().subscribe(goals => {
      expect(goals).toEqual([]);
    });
    const req = httpMock.expectOne('http://localhost:5000/savings-goals/');
    req.flush(null);
  });

  // getAll with filters tests
  it('getAll() passes filters as query params', () => {
    service.getAll({ status: 'active' }).subscribe();
    const req = httpMock.expectOne(r => r.url === 'http://localhost:5000/savings-goals/');
    expect(req.request.params.get('status')).toBe('active');
    req.flush({ goals: [] });
  });

  it('getAll() filters out null values', () => {
    service.getAll({ status: 'active', category: null }).subscribe();
    const req = httpMock.expectOne(r => r.url === 'http://localhost:5000/savings-goals/');
    expect(req.request.params.has('category')).toBe(false);
    req.flush({ goals: [] });
  });

  it('getAll() filters out undefined values', () => {
    service.getAll({ status: undefined }).subscribe();
    const req = httpMock.expectOne(r => r.url === 'http://localhost:5000/savings-goals/');
    expect(req.request.params.has('status')).toBe(false);
    req.flush({ goals: [] });
  });

  it('getAll() filters out empty string values', () => {
    service.getAll({ status: '', category: 'savings' }).subscribe();
    const req = httpMock.expectOne(r => r.url === 'http://localhost:5000/savings-goals/');
    expect(req.request.params.has('status')).toBe(false);
    req.flush({ goals: [] });
  });

  // create tests
  it('create() POSTs to /savings-goals/', () => {
    const data = { name: 'Car', target_amount: 5000 };
    service.create(data).subscribe();
    const req = httpMock.expectOne('http://localhost:5000/savings-goals/');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('create() sends correct data payload', () => {
    const data = { name: 'Vacation', target_amount: 3000, current_amount: 500 };
    service.create(data).subscribe();
    const req = httpMock.expectOne('http://localhost:5000/savings-goals/');
    expect(req.request.body).toEqual(data);
    req.flush({});
  });

  // update tests
  it('update() PUTs to /savings-goals/:id', () => {
    service.update('1', { current_amount: 500 }).subscribe();
    const req = httpMock.expectOne('http://localhost:5000/savings-goals/1');
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('update() sends correct data payload', () => {
    const data = { name: 'Updated Goal', target_amount: 6000, current_amount: 1000 };
    service.update('1', data).subscribe();
    const req = httpMock.expectOne('http://localhost:5000/savings-goals/1');
    expect(req.request.body).toEqual(data);
    req.flush({});
  });

  // delete tests
  it('delete() DELETEs /savings-goals/:id', () => {
    service.delete('1').subscribe();
    const req = httpMock.expectOne('http://localhost:5000/savings-goals/1');
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });
});