import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SavingsComponent } from './savings';

describe('SavingsComponent', () => {
  let component: SavingsComponent;
  let fixture: ComponentFixture<SavingsComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SavingsComponent],
      providers: [
        provideHttpClient(withInterceptors([])),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SavingsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function init() {
    fixture.detectChanges();
    tick(0);
    httpMock.expectOne(r => r.url === 'http://localhost:5000/savings-goals/').flush({ goals: [] });
    tick();
  }

  it('should create', fakeAsync(() => {
    init();
    expect(component).toBeTruthy();
  }));

  it('progress() returns 0 when target is 0', fakeAsync(() => {
    init();
    expect(component.progress({ target_amount: 0, current_amount: 100 })).toBe(0);
  }));

  it('progress() returns correct percentage', fakeAsync(() => {
    init();
    expect(component.progress({ target_amount: 1000, current_amount: 250 })).toBe(25);
  }));

  it('progress() caps at 100', fakeAsync(() => {
    init();
    expect(component.progress({ target_amount: 100, current_amount: 200 })).toBe(100);
  }));

  it('totalSaved sums current amounts', fakeAsync(() => {
    init();
    component.goals = [
      { target_amount: 1000, current_amount: 200 },
      { target_amount: 500, current_amount: 100 }
    ];
    expect(component.totalSaved).toBe(300);
  }));

  it('completedCount counts goals at 100%', fakeAsync(() => {
    init();
    component.goals = [
      { target_amount: 100, current_amount: 100 },
      { target_amount: 100, current_amount: 50 }
    ];
    expect(component.completedCount).toBe(1);
  }));

  it('createGoal() shows error if name is empty', fakeAsync(() => {
    init();
    component.form.name = '';
    component.createGoal();
    expect(component.error).toBe('Goal name is required');
  }));

  it('createGoal() shows error if target_amount is 0', fakeAsync(() => {
    init();
    component.form.name = 'House';
    component.form.target_amount = 0;
    component.createGoal();
    expect(component.error).toBe('Target amount must be greater than 0');
  }));

  it('createGoal() successful POST', fakeAsync(() => {
    init();
    component.form = {
      name: 'Holiday',
      target_amount: 2000,
      current_amount: 0,
      target_date: '2026-12-31',
      category: 'travel',
      priority: 'medium',
      notes: ''
    };
    component.createGoal();
    const req = httpMock.expectOne('http://localhost:5000/savings-goals/');
    expect(req.request.method).toBe('POST');
    req.flush({});
    httpMock.expectOne(r => r.url === 'http://localhost:5000/savings-goals/').flush({ goals: [] });
    tick();
    expect(component.success).toBe('Savings goal created successfully');
    expect(component.mode).toBe('list');
  }));

  it('updateGoal() successful PUT', fakeAsync(() => {
    init();
    component.selectedGoal = { id: 'g1' };
    component.editForm = {
      name: 'Holiday Updated',
      target_amount: 2500,
      current_amount: 500,
      target_date: '2026-12-31',
      category: 'travel',
      priority: 'high',
      notes: 'Testing'
    };
    component.updateGoal();
    const req = httpMock.expectOne('http://localhost:5000/savings-goals/g1');
    expect(req.request.method).toBe('PUT');
    req.flush({});
    tick();
    expect(component.success).toBe('Savings goal updated successfully');
    expect(component.mode).toBe('detail');
  }));

  it('deleteGoal() successful DELETE', fakeAsync(() => {
    init();
    spyOn(window, 'confirm').and.returnValue(true);
    const goal = { id: 'g1', name: 'Holiday' };
    component.deleteGoal(goal);
    const req = httpMock.expectOne('http://localhost:5000/savings-goals/g1');
    expect(req.request.method).toBe('DELETE');
    req.flush({});
    httpMock.expectOne(r => r.url === 'http://localhost:5000/savings-goals/').flush({ goals: [] });
    tick();
    expect(component.success).toBe('Savings goal deleted successfully');
  }));

  it('deleteGoal() does nothing if user cancels confirm', fakeAsync(() => {
    init();
    spyOn(window, 'confirm').and.returnValue(false);
    component.deleteGoal({ id: 'g1', name: 'Holiday' });
    httpMock.expectNone('http://localhost:5000/savings-goals/g1');
    expect(component.success).toBe('');
  }));

  it('goalName() falls back to "Savings goal" when no name or title', fakeAsync(() => {
    init();
    expect(component.goalName({})).toBe('Savings goal');
  }));

  it('goalName() uses title if name is absent', fakeAsync(() => {
    init();
    expect(component.goalName({ title: 'Emergency Fund' })).toBe('Emergency Fund');
  }));

  it('averageProgress calculates correctly', fakeAsync(() => {
    init();
    component.goals = [
      { target_amount: 100, current_amount: 50 },
      { target_amount: 100, current_amount: 100 }
    ];
    expect(component.averageProgress).toBe(75);
  }));

  it('totalRemaining = totalTarget - totalSaved', fakeAsync(() => {
    init();
    component.goals = [{ target_amount: 1000, current_amount: 300 }];
    expect(component.totalRemaining).toBe(700);
  }));

  it('applyLocalFilters() filters by complete status', fakeAsync(() => {
    init();
    component.allGoals = [
      { target_amount: 100, current_amount: 100 },
      { target_amount: 100, current_amount: 50 }
    ];
    component.selectedStatus = 'complete';
    component.applyLocalFilters();
    expect(component.goals.length).toBe(1);
  }));

  it('applyLocalFilters() filters by active status', fakeAsync(() => {
    init();
    component.allGoals = [
      { target_amount: 100, current_amount: 100 },
      { target_amount: 100, current_amount: 50 }
    ];
    component.selectedStatus = 'active';
    component.applyLocalFilters();
    expect(component.goals.length).toBe(1);
  }));

  it('getGoalIcon() returns house icon for house category', fakeAsync(() => {
    init();
    expect(component.getGoalIcon('house')).toBe('bi-house-heart');
  }));

  it('getGoalIcon() returns default icon for unknown category', fakeAsync(() => {
    init();
    expect(component.getGoalIcon('misc')).toBe('bi-piggy-bank');
  }));
});