import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SavingsService } from '../../services/savings';

type SavingsMode = 'list' | 'add' | 'detail' | 'edit';

@Component({
  selector: 'app-savings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './savings.html',
  styleUrl: './savings.css'
})
export class SavingsComponent implements OnInit {
  goals: any[] = [];
  allGoals: any[] = [];
  selectedGoal: any = null;

  mode: SavingsMode = 'list';

  loading = true;
  submitting = false;
  error = '';
  success = '';

  selectedStatus = '';
  selectedPriority = '';

  currentPage = 1;
  pageSize = 6;

  priorities = ['low', 'medium', 'high'];

  form = this.getEmptyForm();
  editForm = this.getEmptyForm();

  constructor(
    private savingsService: SavingsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    history.replaceState({ savingsMode: 'list' }, '', window.location.href);
    setTimeout(() => this.loadGoals(), 0);
  }

  @HostListener('window:popstate', ['$event'])
  onBrowserBack(event: PopStateEvent) {
    const state = event.state;

    if (!state || state.savingsMode === 'list') {
      this.mode = 'list';
      this.selectedGoal = null;
      this.resetMessages();
      this.cdr.detectChanges();
      return;
    }

    if (state.savingsMode === 'detail') {
      this.mode = 'detail';
      this.resetMessages();
      this.cdr.detectChanges();
      return;
    }

    if (state.savingsMode === 'edit') {
      this.mode = 'edit';
      this.resetMessages();
      this.cdr.detectChanges();
      return;
    }

    if (state.savingsMode === 'add') {
      this.mode = 'add';
      this.resetMessages();
      this.cdr.detectChanges();
    }
  }

  loadGoals() {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    this.savingsService.getAll().subscribe({
      next: (res: any) => {
        this.allGoals = Array.isArray(res) ? res : [];
        this.applyLocalFilters(false);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to load savings goals';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Filtering is done client-side — status (complete/active) is derived from progress, not stored on the backend
  applyLocalFilters(resetPage = true) {
    let filtered = [...this.allGoals];

    if (this.selectedPriority) {
      filtered = filtered.filter(
        (g: any) => String(g.priority || '').toLowerCase() === this.selectedPriority.toLowerCase()
      );
    }

    if (this.selectedStatus === 'complete') {
      filtered = filtered.filter((g: any) => this.progress(g) >= 100);
    }

    if (this.selectedStatus === 'active') {
      filtered = filtered.filter((g: any) => this.progress(g) < 100);
    }

    this.goals = filtered;

    if (resetPage) {
      this.currentPage = 1;
    }
  }

  applyFilters() {
    this.applyLocalFilters(true);
  }

  resetFilters() {
    this.selectedStatus = '';
    this.selectedPriority = '';
    this.applyLocalFilters(true);
  }

  get pagedGoals() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.goals.slice(start, start + this.pageSize);
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.goals.length / this.pageSize));
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  showList() {
    this.mode = 'list';
    this.selectedGoal = null;
    this.resetMessages();
    history.pushState({ savingsMode: 'list' }, '', window.location.href);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showAdd() {
    this.mode = 'add';
    this.selectedGoal = null;
    this.resetForm();
    this.resetMessages();
    history.pushState({ savingsMode: 'add' }, '', window.location.href);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showDetail(goal: any) {
    this.selectedGoal = goal;
    this.mode = 'detail';
    this.resetMessages();
    history.pushState({ savingsMode: 'detail', id: goal.id }, '', window.location.href);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showEdit(goal: any, event?: Event) {
    if (event) event.stopPropagation();

    this.selectedGoal = goal;

    this.editForm = {
      name: goal.name || goal.title || '',
      target_amount: Number(goal.target_amount) || 0,
      current_amount: Number(goal.current_amount) || 0,
      target_date: goal.target_date || goal.deadline
        ? String(goal.target_date || goal.deadline).slice(0, 10)
        : '',
      category: goal.category || '',
      priority: goal.priority || 'medium',
      notes: goal.notes || goal.description || ''
    };

    this.mode = 'edit';
    this.resetMessages();
    history.pushState({ savingsMode: 'edit', id: goal.id }, '', window.location.href);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  createGoal() {
    if (!this.form.name.trim()) {
      this.error = 'Goal name is required';
      return;
    }

    if (!this.form.target_amount || Number(this.form.target_amount) <= 0) {
      this.error = 'Target amount must be greater than 0';
      return;
    }

    this.submitting = true;
    this.resetMessages();

    this.savingsService.create(this.form).subscribe({
      next: () => {
        this.success = 'Savings goal created successfully';
        this.submitting = false;
        this.mode = 'list';
        this.selectedGoal = null;
        this.resetForm();
        history.replaceState({ savingsMode: 'list' }, '', window.location.href);
        this.loadGoals();
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to create savings goal';
        this.submitting = false;
      }
    });
  }

  updateGoal() {
    if (!this.selectedGoal) return;

    if (!this.editForm.name.trim()) {
      this.error = 'Goal name is required';
      return;
    }

    if (!this.editForm.target_amount || Number(this.editForm.target_amount) <= 0) {
      this.error = 'Target amount must be greater than 0';
      return;
    }

    this.submitting = true;
    this.resetMessages();

    const payload = { ...this.editForm };

    this.savingsService.update(this.selectedGoal.id, payload).subscribe({
      next: (res: any) => {
        this.success = 'Savings goal updated successfully';
        this.submitting = false;

        const updatedGoal =
          res?.goal ||
          res?.data?.goal ||
          res?.data ||
          payload;

        this.selectedGoal = {
          ...this.selectedGoal,
          ...updatedGoal,
          id: this.selectedGoal.id
        };

        this.mode = 'detail';

        history.replaceState(
          { savingsMode: 'detail', id: this.selectedGoal.id },
          '',
          window.location.href
        );

        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to update savings goal';
        this.submitting = false;
      }
    });
  }

  deleteGoal(goal: any, event?: Event) {
    if (event) event.stopPropagation();

    if (!confirm(`Delete ${this.goalName(goal)}?`)) return;

    this.savingsService.delete(goal.id).subscribe({
      next: () => {
        this.success = 'Savings goal deleted successfully';

        if (this.selectedGoal?.id === goal.id) {
          this.selectedGoal = null;
          this.mode = 'list';
          history.replaceState({ savingsMode: 'list' }, '', window.location.href);
        }

        this.loadGoals();
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to delete savings goal';
      }
    });
  }

  getEmptyForm() {
    return {
      name: '',
      target_amount: 0,
      current_amount: 0,
      target_date: '',
      category: '',
      priority: 'medium',
      notes: ''
    };
  }

  resetForm() {
    this.form = this.getEmptyForm();
  }

  resetMessages() {
    this.error = '';
    this.success = '';
  }

  goalName(goal: any) {
    return goal.name || goal.title || 'Savings goal';
  }

  targetAmount(goal: any) {
    return Number(goal.target_amount) || 0;
  }

  currentAmount(goal: any) {
    return Number(goal.current_amount) || 0;
  }

  remainingAmount(goal: any) {
    return Math.max(0, this.targetAmount(goal) - this.currentAmount(goal));
  }

  progress(goal: any) {
    const target = this.targetAmount(goal);
    if (!target) return 0;
    return Math.min(100, Math.max(0, (this.currentAmount(goal) / target) * 100));
  }

  get totalTarget() {
    return this.goals.reduce((sum: number, g: any) => sum + this.targetAmount(g), 0);
  }

  get totalSaved() {
    return this.goals.reduce((sum: number, g: any) => sum + this.currentAmount(g), 0);
  }

  get totalRemaining() {
    return Math.max(0, this.totalTarget - this.totalSaved);
  }

  get completedCount() {
    return this.goals.filter((g: any) => this.progress(g) >= 100).length;
  }

  get averageProgress() {
    if (!this.goals.length) return 0;
    return this.goals.reduce((sum: number, g: any) => sum + this.progress(g), 0) / this.goals.length;
  }

  getGoalIcon(category: string) {
    const value = String(category || '').toLowerCase();

    if (value.includes('house') || value.includes('home')) return 'bi-house-heart';
    if (value.includes('car')) return 'bi-car-front';
    if (value.includes('holiday') || value.includes('travel')) return 'bi-airplane';
    if (value.includes('emergency')) return 'bi-shield-check';
    if (value.includes('education')) return 'bi-mortarboard';
    if (value.includes('wedding')) return 'bi-heart';

    return 'bi-piggy-bank';
  }
}