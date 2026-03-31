import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SavingsGoalService } from '../../services/savings-goal';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-savings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './savings.html'
})
export class SavingsComponent implements OnInit {
  goals: any[] = [];
  loading = false;
  showForm = false;
  editingGoal: any = null;
  submitting = false;
  error = '';
  success = '';

  form = {
    name: '',
    target_amount: 0,
    current_amount: 0,
    deadline: ''
  };

  editForm = {
    name: '',
    target_amount: 0,
    current_amount: 0,
    deadline: ''
  };

  constructor(
    private savingsService: SavingsGoalService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    setTimeout(() => this.loadGoals(), 0);
  }

loadGoals() {
  this.loading = true;
  this.cdr.detectChanges();
  this.savingsService.getAll().subscribe({
    next: (res: any) => {
      this.goals   = Array.isArray(res) ? res : res.items || [];
      this.loading = false;
      this.cdr.detectChanges();
    },
    error: () => {
      this.loading = false;
      this.cdr.detectChanges();
    }
  });
}
  onSubmit() {
    this.submitting = true;
    this.error = '';
    this.savingsService.create(this.form).subscribe({
      next: () => {
        this.success  = 'Savings goal created!';
        this.showForm = false;
        this.resetForm();
        this.loadGoals();
        this.submitting = false;
        setTimeout(() => this.success = '', 3000);
      },
      error: (err: any) => {
        this.error      = err.error?.error || 'Failed to create goal';
        this.submitting = false;
      }
    });
  }

  startEdit(goal: any) {
    this.editingGoal = goal;
    this.showForm    = false;
    this.editForm    = {
      name:           goal.name,
      target_amount:  goal.target_amount,
      current_amount: goal.current_amount,
      deadline:       goal.deadline?.split('T')[0] || ''
    };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onEdit() {
    if (!this.editingGoal) return;
    this.submitting = true;
    this.error = '';
    this.savingsService.update(this.editingGoal.id, this.editForm).subscribe({
      next: () => {
        this.success     = 'Goal updated successfully!';
        this.editingGoal = null;
        this.loadGoals();
        this.submitting  = false;
        setTimeout(() => this.success = '', 3000);
      },
      error: (err: any) => {
        this.error      = err.error?.error || 'Failed to update goal';
        this.submitting = false;
      }
    });
  }

  deleteGoal(id: string) {
    if (!confirm('Delete this savings goal?')) return;
    this.savingsService.delete(id).subscribe({
      next: () => {
        this.success = 'Goal deleted!';
        this.loadGoals();
        setTimeout(() => this.success = '', 3000);
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to delete goal';
      }
    });
  }

  getProgress(current: number, target: number) {
    if (!target) return 0;
    return Math.min((current / target) * 100, 100);
  }

  getDaysLeft(deadline: string) {
    if (!deadline) return null;
    const diff = new Date(deadline).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  get totalSaved() {
    return this.goals.reduce((sum, g) => sum + (g.current_amount || 0), 0);
  }

  get totalTarget() {
    return this.goals.reduce((sum, g) => sum + (g.target_amount || 0), 0);
  }

  resetForm() {
    this.form = { name: '', target_amount: 0, current_amount: 0, deadline: '' };
  }

  logout() { this.auth.logout(); }
}