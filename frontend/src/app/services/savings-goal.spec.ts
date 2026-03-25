import { TestBed } from '@angular/core/testing';

import { SavingsGoal } from './savings-goal';

describe('SavingsGoal', () => {
  let service: SavingsGoal;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SavingsGoal);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
