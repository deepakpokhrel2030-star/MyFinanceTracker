import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TransactionsComponent } from './transactions';

describe('TransactionsComponent', () => {
  let component: TransactionsComponent;
  let fixture: ComponentFixture<TransactionsComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function init() {
    fixture.detectChanges();
    tick(0);
    httpMock.expectOne(r => r.url === 'http://localhost:5000/accounts/').flush({ accounts: [] });
    httpMock.expectOne(r => r.url === 'http://localhost:5000/transactions/').flush({ items: [], total: 0, page: 1, pages: 1 });
    tick();
  }

  it('should create', fakeAsync(() => {
    init();
    expect(component).toBeTruthy();
  }));

  it('incomeTotal sums positive transactions', fakeAsync(() => {
    init();
    component.transactions = [{ amount: 100 }, { amount: 50 }, { amount: -30 }];
    expect(component.incomeTotal).toBe(150);
  }));

  it('expenseTotal sums absolute negative transactions', fakeAsync(() => {
    init();
    component.transactions = [{ amount: 100 }, { amount: -30 }, { amount: -20 }];
    expect(component.expenseTotal).toBe(50);
  }));

  it('netTotal = incomeTotal - expenseTotal', fakeAsync(() => {
    init();
    component.transactions = [{ amount: 100 }, { amount: -40 }];
    expect(component.netTotal).toBe(60);
  }));

  it('createTransaction() sets error if no account selected', fakeAsync(() => {
    init();
    component.form.account_id = '';
    component.createTransaction();
    expect(component.error).toBe('Please select an account');
  }));

  it('createTransaction() sets error if amount is 0', fakeAsync(() => {
    init();
    component.form.account_id = 'acc1';
    component.form.amount = 0;
    component.createTransaction();
    expect(component.error).toBe('Amount must be greater than 0');
  }));

  it('buildPayload negates amount for expense', fakeAsync(() => {
    init();
    expect(component.buildPayload({ type: 'expense', amount: 50 }).amount).toBe(-50);
  }));

  it('buildPayload keeps positive amount for income', fakeAsync(() => {
    init();
    expect(component.buildPayload({ type: 'income', amount: 100 }).amount).toBe(100);
  }));

  it('createTransaction() successful POST', fakeAsync(() => {
    init();
    component.form = {
      account_id: 'acc1',
      type: 'income',
      amount: 100,
      category: 'salary',
      merchant: 'Company',
      description: 'Payday',
      date: '2026-04-30'
    };
    component.createTransaction();
    const req = httpMock.expectOne('http://localhost:5000/transactions/');
    expect(req.request.method).toBe('POST');
    req.flush({});
    httpMock.expectOne(r => r.url === 'http://localhost:5000/transactions/').flush({ items: [] });
    tick();
    expect(component.success).toBe('Transaction created successfully');
    expect(component.mode).toBe('list');
  }));

  it('updateTransaction() successful PUT', fakeAsync(() => {
    init();
    component.selectedTransaction = { id: 'tx1' };
    component.editForm = {
      account_id: 'acc1',
      type: 'expense',
      amount: 50,
      category: 'food',
      merchant: 'Grocery',
      description: 'Milk',
      date: '2026-04-30'
    };
    component.updateTransaction();
    const req = httpMock.expectOne('http://localhost:5000/transactions/tx1');
    expect(req.request.method).toBe('PUT');
    req.flush({});
    tick();
    expect(component.success).toBe('Transaction updated successfully');
    expect(component.mode).toBe('detail');
  }));

  it('deleteTransaction() successful DELETE', fakeAsync(() => {
    init();
    spyOn(window, 'confirm').and.returnValue(true);
    const tx = { id: 'tx1' };
    component.deleteTransaction(tx);
    const req = httpMock.expectOne('http://localhost:5000/transactions/tx1');
    expect(req.request.method).toBe('DELETE');
    req.flush({});
    httpMock.expectOne(r => r.url === 'http://localhost:5000/transactions/').flush({ items: [] });
    tick();
    expect(component.success).toBe('Transaction deleted successfully');
  }));

  it('deleteTransaction() does nothing if user cancels confirm', fakeAsync(() => {
    init();
    spyOn(window, 'confirm').and.returnValue(false);
    component.deleteTransaction({ id: 'tx1' });
    httpMock.expectNone('http://localhost:5000/transactions/tx1');
    expect(component.success).toBe('');
  }));

  it('getTransactionType() returns income for positive amount', fakeAsync(() => {
    init();
    expect(component.getTransactionType({ amount: 100 })).toBe('income');
  }));

  it('getTransactionType() returns expense for negative amount', fakeAsync(() => {
    init();
    expect(component.getTransactionType({ amount: -50 })).toBe('expense');
  }));

  it('getAccountName() returns account name by id', fakeAsync(() => {
    init();
    component.accounts = [{ id: 'acc1', name: 'My Bank' }];
    expect(component.getAccountName('acc1')).toBe('My Bank');
  }));

  it('getAccountName() returns unknown account for missing id', fakeAsync(() => {
    init();
    component.accounts = [];
    expect(component.getAccountName('missing')).toBe('Unknown account');
  }));

  it('abs() returns absolute value', fakeAsync(() => {
    init();
    expect(component.abs(-150)).toBe(150);
    expect(component.abs(150)).toBe(150);
  }));

  it('updateTransaction() sets error if no account selected', fakeAsync(() => {
    init();
    component.selectedTransaction = { id: 'tx1' };
    component.editForm.account_id = '';
    component.updateTransaction();
    expect(component.error).toBe('Please select an account');
  }));
});