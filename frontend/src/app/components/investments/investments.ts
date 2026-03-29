import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InvestmentService } from '../../services/investment';
import { AuthService } from '../../services/auth';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-investments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './investments.html'
})
export class InvestmentsComponent implements OnInit {
  investments: any[] = [];
  analytics: any = null;
  loading = false;
  showForm = false;
  editingInv: any = null;
  submitting = false;
  error = '';
  success = '';

  form = {
    type: 'stock',
    symbol: '',
    name: '',
    quantity: 0,
    purchase_price: 0,
    current_price: 0,
    currency: 'GBP',
    broker: '',
    sector: ''
  };

  editForm = {
    current_price: 0,
    quantity: 0,
    broker: '',
    sector: ''
  };

  constructor(
    private investmentService: InvestmentService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    setTimeout(() => this.loadInvestments(), 0);
  }

  loadInvestments() {
    this.loading = true;
    this.cdr.detectChanges();

    forkJoin({
      investments: this.investmentService.getAll(),
      analytics:   this.investmentService.getAnalytics()
    }).subscribe({
      next: (res: any) => {
        this.investments = res.investments || [];
        this.analytics   = res.analytics;
        this.loading     = false;
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
    this.investmentService.create(this.form).subscribe({
      next: () => {
        this.success  = 'Investment added successfully!';
        this.showForm = false;
        this.resetForm();
        this.loadInvestments();
        this.submitting = false;
        setTimeout(() => this.success = '', 3000);
      },
      error: (err: any) => {
        this.error      = err.error?.error || 'Failed to add investment';
        this.submitting = false;
      }
    });
  }

  startEdit(inv: any) {
    this.editingInv = inv;
    this.showForm   = false;
    this.editForm   = {
      current_price: inv.current_price,
      quantity:      inv.quantity,
      broker:        inv.broker || '',
      sector:        inv.sector || ''
    };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onEdit() {
    if (!this.editingInv) return;
    this.submitting = true;
    this.error = '';
    this.investmentService.update(this.editingInv.id, this.editForm).subscribe({
      next: () => {
        this.success    = 'Investment updated!';
        this.editingInv = null;
        this.loadInvestments();
        this.submitting = false;
        setTimeout(() => this.success = '', 3000);
      },
      error: (err: any) => {
        this.error      = err.error?.error || 'Failed to update investment';
        this.submitting = false;
      }
    });
  }

  deleteInvestment(id: string) {
    if (!confirm('Delete this investment?')) return;
    this.investmentService.delete(id).subscribe({
      next: () => {
        this.success = 'Investment deleted!';
        this.loadInvestments();
        setTimeout(() => this.success = '', 3000);
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to delete';
      }
    });
  }

  resetForm() {
    this.form = {
      type: 'stock', symbol: '', name: '',
      quantity: 0, purchase_price: 0, current_price: 0,
      currency: 'GBP', broker: '', sector: ''
    };
  }

  logout() { this.auth.logout(); }
}