import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AccountsComponent } from './accounts';

describe('AccountsComponent', () => {
  let component: AccountsComponent;
  let fixture: ComponentFixture<AccountsComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountsComponent],
      providers: [
        provideHttpClient(withInterceptors([])),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AccountsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function init() {
    fixture.detectChanges();
    tick(0);
    httpMock.expectOne('http://localhost:5000/accounts/').flush({ accounts: [] });
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

  it('totalBalance returns sum of account balances', fakeAsync(() => {
    init();
    component.accounts = [{ balance: 100 }, { balance: 200 }, { balance: -50 }];
    expect(component.totalBalance).toBe(250);
  }));

  it('positiveAccounts counts accounts with balance >= 0', fakeAsync(() => {
    init();
    component.accounts = [{ balance: 100 }, { balance: 0 }, { balance: -50 }];
    expect(component.positiveAccounts).toBe(2);
  }));

  it('negativeAccounts counts accounts with balance < 0', fakeAsync(() => {
    init();
    component.accounts = [{ balance: 100 }, { balance: -50 }];
    expect(component.negativeAccounts).toBe(1);
  }));

  it('getAccountIcon returns correct icon for savings', fakeAsync(() => {
    init();
    expect(component.getAccountIcon('savings')).toBe('bi-piggy-bank');
  }));

  it('getAccountIcon returns bi-bank for unknown type', fakeAsync(() => {
    init();
    expect(component.getAccountIcon('unknown')).toBe('bi-bank');
  }));

  it('createAccount() sets error if name is empty', fakeAsync(() => {
    init();
    component.form.name = '';
    component.createAccount();
    expect(component.error).toBe('Account name is required');
  }));

  it('showAdd() switches mode to add', fakeAsync(() => {
    init();
    component.showAdd();
    expect(component.mode).toBe('add');
  }));

  it('createAccount() successful POST', fakeAsync(() => {
    init();
    component.form = {
      name: 'New Account',
      account_type: 'savings',
      balance: 1000,
      currency: 'GBP',
      bank_name: 'HSBC'
    };
    component.createAccount();
    const req = httpMock.expectOne('http://localhost:5000/accounts/');
    expect(req.request.method).toBe('POST');
    req.flush({});
    httpMock.expectOne('http://localhost:5000/accounts/').flush({ accounts: [] });
    tick();
    expect(component.success).toBe('Account created successfully');
    expect(component.mode).toBe('list');
  }));

  it('updateAccount() successful PUT', fakeAsync(() => {
    init();
    component.selectedAccount = { id: '1', name: 'Old Name' };
    component.editForm = {
      name: 'New Name',
      account_type: 'checking',
      balance: 500,
      currency: 'GBP',
      bank_name: 'Barclays'
    };
    component.updateAccount();
    const req = httpMock.expectOne('http://localhost:5000/accounts/1');
    expect(req.request.method).toBe('PUT');
    req.flush({});
    httpMock.expectOne('http://localhost:5000/accounts/').flush({ accounts: [] });
    tick();
    expect(component.success).toBe('Account updated successfully');
    expect(component.mode).toBe('detail');
  }));

  it('deleteAccount() successful DELETE', fakeAsync(() => {
    init();
    spyOn(window, 'confirm').and.returnValue(true);
    const account = { id: '1', name: 'To Delete' };
    component.deleteAccount(account);
    const req = httpMock.expectOne('http://localhost:5000/accounts/1');
    expect(req.request.method).toBe('DELETE');
    req.flush({});
    httpMock.expectOne('http://localhost:5000/accounts/').flush({ accounts: [] });
    tick();
    expect(component.success).toBe('Account deleted successfully');
  }));

  it('deleteAccount() does nothing if user cancels confirm', fakeAsync(() => {
    init();
    spyOn(window, 'confirm').and.returnValue(false);
    component.deleteAccount({ id: '1', name: 'Test' });
    httpMock.expectNone('http://localhost:5000/accounts/1');
    expect(component.success).toBe('');
  }));

  it('showDetail() switches to detail mode', fakeAsync(() => {
    init();
    const account = { id: '1', name: 'Checking' };
    component.showDetail(account);
    expect(component.mode).toBe('detail');
    expect(component.selectedAccount).toBe(account);
  }));

  it('showList() switches back to list mode', fakeAsync(() => {
    init();
    component.mode = 'detail';
    component.showList();
    expect(component.mode).toBe('list');
    expect(component.selectedAccount).toBeNull();
  }));

  it('accountWidth() returns proportional width', fakeAsync(() => {
    init();
    component.accounts = [{ balance: 1000 }, { balance: 500 }];
    expect(component.accountWidth(1000)).toBe(100);
    expect(component.accountWidth(500)).toBe(50);
  }));

  it('createAccount() shows error on failed POST', fakeAsync(() => {
    init();
    component.form.name = 'Test';
    component.createAccount();
    const req = httpMock.expectOne('http://localhost:5000/accounts/');
    req.flush({ error: 'Duplicate account' }, { status: 400, statusText: 'Bad Request' });
    tick();
    expect(component.error).toBeTruthy();
    expect(component.submitting).toBeFalse();
  }));
});