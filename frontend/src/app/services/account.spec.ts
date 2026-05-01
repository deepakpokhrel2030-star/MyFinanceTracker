import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AccountService } from './account';

describe('AccountService', () => {
  let service: AccountService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AccountService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(AccountService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // getAll tests
  it('getAll() maps accounts array and normalises account_type', () => {
    const mockAccounts = [{ id: '1', name: 'Current', type: 'checking', balance: 100 }];
    service.getAll().subscribe(accounts => {
      expect(accounts.length).toBe(1);
      expect(accounts[0].account_type).toBe('checking');
    });
    const req = httpMock.expectOne('http://localhost:5000/accounts/');
    expect(req.request.method).toBe('GET');
    req.flush({ accounts: mockAccounts });
  });

  it('getAll() handles items wrapper', () => {
    const mockAccounts = [{ id: '1', name: 'Savings', balance: 500 }];
    service.getAll().subscribe(accounts => {
      expect(accounts.length).toBe(1);
      expect(accounts[0].name).toBe('Savings');
    });
    const req = httpMock.expectOne('http://localhost:5000/accounts/');
    req.flush({ items: mockAccounts });
  });

  it('getAll() handles data.items wrapper', () => {
    const mockAccounts = [{ id: '1', name: 'Investment', balance: 1000 }];
    service.getAll().subscribe(accounts => {
      expect(accounts.length).toBe(1);
    });
    const req = httpMock.expectOne('http://localhost:5000/accounts/');
    req.flush({ data: { items: mockAccounts } });
  });

  it('getAll() handles direct data array', () => {
    const mockAccounts = [{ id: '1', name: 'Cash', balance: 200 }];
    service.getAll().subscribe(accounts => {
      expect(accounts.length).toBe(1);
      expect(accounts[0].name).toBe('Cash');
    });
    const req = httpMock.expectOne('http://localhost:5000/accounts/');
    req.flush(mockAccounts);
  });

  it('getAll() normalises account_type from type field', () => {
    const mockAccounts = [{ id: '1', name: 'Test', type: 'savings', balance: 100 }];
    service.getAll().subscribe(accounts => {
      expect(accounts[0].account_type).toBe('savings');
    });
    const req = httpMock.expectOne('http://localhost:5000/accounts/');
    req.flush({ accounts: mockAccounts });
  });

  it('getAll() defaults account_type to checking when missing', () => {
    const mockAccounts = [{ id: '1', name: 'Test', balance: 100 }];
    service.getAll().subscribe(accounts => {
      expect(accounts[0].account_type).toBe('checking');
    });
    const req = httpMock.expectOne('http://localhost:5000/accounts/');
    req.flush({ accounts: mockAccounts });
  });

  it('getAll() returns empty array for invalid response', () => {
    service.getAll().subscribe(accounts => {
      expect(accounts).toEqual([]);
    });
    const req = httpMock.expectOne('http://localhost:5000/accounts/');
    req.flush(null);
  });

  // create tests
  it('create() POSTs to /accounts/', () => {
    const data = { name: 'Savings', account_type: 'savings', balance: 500 };
    service.create(data).subscribe();
    const req = httpMock.expectOne('http://localhost:5000/accounts/');
    expect(req.request.method).toBe('POST');
    req.flush({ id: '2', ...data });
  });

  it('create() normalizes account_type from type field', () => {
    const data = { name: 'Test', type: 'investment', balance: 100 };
    service.create(data).subscribe();
    const req = httpMock.expectOne('http://localhost:5000/accounts/');
    expect(req.request.body.account_type).toBe('investment');
    expect(req.request.body.type).toBe('investment');
    req.flush({});
  });

  it('create() converts balance to number', () => {
    const data = { name: 'Test', account_type: 'checking', balance: '500' };
    service.create(data).subscribe();
    const req = httpMock.expectOne('http://localhost:5000/accounts/');
    expect(req.request.body.balance).toBe(500);
    req.flush({});
  });

  it('create() defaults balance to 0 for invalid values', () => {
    const data = { name: 'Test', account_type: 'checking', balance: 'abc' };
    service.create(data).subscribe();
    const req = httpMock.expectOne('http://localhost:5000/accounts/');
    expect(req.request.body.balance).toBe(0);
    req.flush({});
  });

  // update tests
  it('update() PUTs to /accounts/:id', () => {
    const data = { name: 'Updated', account_type: 'savings', balance: 600 };
    service.update('2', data).subscribe();
    const req = httpMock.expectOne('http://localhost:5000/accounts/2');
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('update() normalizes data before sending', () => {
    const data = { name: 'Updated', type: 'checking', balance: '100' };
    service.update('2', data).subscribe();
    const req = httpMock.expectOne('http://localhost:5000/accounts/2');
    expect(req.request.body.account_type).toBe('checking');
    expect(req.request.body.balance).toBe(100);
    req.flush({});
  });

  // delete tests
  it('delete() DELETEs /accounts/:id', () => {
    service.delete('2').subscribe();
    const req = httpMock.expectOne('http://localhost:5000/accounts/2');
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });
});