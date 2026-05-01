import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { InvestmentsComponent } from './investments';

describe('InvestmentsComponent', () => {
  let component: InvestmentsComponent;
  let fixture: ComponentFixture<InvestmentsComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvestmentsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InvestmentsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function init() {
    fixture.detectChanges();
    tick(0);
    httpMock.expectOne(r => r.url === 'http://localhost:5000/investments/').flush({ investments: [] });
    tick();
  }

  it('should create', fakeAsync(() => {
    init();
    expect(component).toBeTruthy();
  }));

  it('currentValue() calculates from quantity × current_price', fakeAsync(() => {
    init();
    expect(component.currentValue({ quantity: 10, current_price: 150 })).toBe(1500);
  }));

  it('profitLoss() uses stored value if available', fakeAsync(() => {
    init();
    expect(component.profitLoss({ profit_loss: 200 })).toBe(200);
  }));

  it('totalProfitLoss = totalCurrentValue - totalInvested', fakeAsync(() => {
    init();
    component.investments = [{ quantity: 10, purchase_price: 100, current_price: 120 }];
    expect(component.totalProfitLoss).toBe(200);
  }));

  it('createInvestment() shows error if symbol is empty', fakeAsync(() => {
    init();
    component.form.symbol = '';
    component.createInvestment();
    expect(component.error).toBe('Symbol is required');
  }));

  it('createInvestment() shows error if name is empty', fakeAsync(() => {
    init();
    component.form.symbol = 'AAPL';
    component.form.name = '';
    component.createInvestment();
    expect(component.error).toBe('Investment name is required');
  }));

  it('createInvestment() shows error if quantity is 0', fakeAsync(() => {
    init();
    component.form.symbol = 'AAPL';
    component.form.name = 'Apple Inc';
    component.form.quantity = 0;
    component.createInvestment();
    expect(component.error).toBe('Quantity must be greater than 0');
  }));

  it('getInvestmentIcon returns crypto icon', fakeAsync(() => {
    init();
    expect(component.getInvestmentIcon('crypto')).toBe('bi-currency-bitcoin');
  }));

  it('createInvestment() successful POST', fakeAsync(() => {
    init();
    component.form = {
      type: 'stock',
      symbol: 'TSLA',
      name: 'Tesla',
      quantity: 5,
      purchase_price: 150,
      current_price: 170,
      currency: 'USD',
      broker: 'DeGiro',
      sector: 'Automotive'
    };
    component.createInvestment();
    const req = httpMock.expectOne('http://localhost:5000/investments/');
    expect(req.request.method).toBe('POST');
    req.flush({});
    httpMock.expectOne(r => r.url === 'http://localhost:5000/investments/').flush({ investments: [] });
    tick();
    expect(component.success).toBe('Investment created successfully');
    expect(component.mode).toBe('list');
  }));

  it('updateInvestment() successful PUT', fakeAsync(() => {
    init();
    component.selectedInvestment = { id: 'i1' };
    component.editForm = {
      type: 'crypto',
      symbol: 'BTC',
      name: 'Bitcoin',
      quantity: 0.1,
      purchase_price: 30000,
      current_price: 40000,
      currency: 'USD',
      broker: 'Coinbase',
      sector: 'Fintech'
    };
    component.updateInvestment();
    const req = httpMock.expectOne('http://localhost:5000/investments/i1');
    expect(req.request.method).toBe('PUT');
    req.flush({});
    tick();
    expect(component.success).toBe('Investment updated successfully');
    expect(component.mode).toBe('detail');
  }));

  it('deleteInvestment() successful DELETE', fakeAsync(() => {
    init();
    spyOn(window, 'confirm').and.returnValue(true);
    const investment = { id: 'i1', symbol: 'BTC' };
    component.deleteInvestment(investment);
    const req = httpMock.expectOne('http://localhost:5000/investments/i1');
    expect(req.request.method).toBe('DELETE');
    req.flush({});
    httpMock.expectOne(r => r.url === 'http://localhost:5000/investments/').flush({ investments: [] });
    tick();
    expect(component.success).toBe('Investment deleted successfully');
  }));

  it('deleteInvestment() does nothing if user cancels confirm', fakeAsync(() => {
    init();
    spyOn(window, 'confirm').and.returnValue(false);
    component.deleteInvestment({ id: 'i1', symbol: 'AAPL' });
    httpMock.expectNone('http://localhost:5000/investments/i1');
    expect(component.success).toBe('');
  }));

  it('investedValue() calculates from quantity × purchase_price', fakeAsync(() => {
    init();
    expect(component.investedValue({ quantity: 5, purchase_price: 100 })).toBe(500);
  }));

  it('investedValue() uses stored invested_value if available', fakeAsync(() => {
    init();
    expect(component.investedValue({ invested_value: 750, quantity: 5, purchase_price: 100 })).toBe(750);
  }));

  it('returnPct() calculates from profitLoss / investedValue', fakeAsync(() => {
    init();
    expect(component.returnPct({ quantity: 10, purchase_price: 100, current_price: 110 })).toBeCloseTo(10);
  }));

  it('returnPct() uses stored return_pct if available', fakeAsync(() => {
    init();
    expect(component.returnPct({ return_pct: 15 })).toBe(15);
  }));

  it('returnPct() returns 0 when invested value is 0', fakeAsync(() => {
    init();
    expect(component.returnPct({ quantity: 0, purchase_price: 0, current_price: 100 })).toBe(0);
  }));

  it('availableSectors returns unique non-empty sectors', fakeAsync(() => {
    init();
    component.allInvestments = [
      { sector: 'Tech' }, { sector: 'Finance' }, { sector: 'Tech' }, { sector: '' }
    ];
    expect(component.availableSectors).toEqual(['Tech', 'Finance']);
  }));

  it('applyLocalFilters() filters by type', fakeAsync(() => {
    init();
    component.allInvestments = [
      { id: '1', type: 'stock' }, { id: '2', type: 'crypto' }
    ];
    component.selectedType = 'crypto';
    component.applyLocalFilters();
    expect(component.investments.length).toBe(1);
    expect(component.investments[0].type).toBe('crypto');
  }));

  it('winnersCount counts investments with profit >= 0', fakeAsync(() => {
    init();
    component.investments = [
      { profit_loss: 50 }, { profit_loss: 0 }, { profit_loss: -20 }
    ];
    expect(component.winnersCount).toBe(2);
  }));
});