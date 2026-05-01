import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AdminComponent } from './admin';

describe('AdminComponent', () => {
  let component: AdminComponent;
  let fixture: ComponentFixture<AdminComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function init() {
    fixture.detectChanges();
    httpMock.expectOne('http://localhost:5000/users/').flush({ data: { items: [] } });
    tick();
  }

  it('should create', fakeAsync(() => {
    init();
    expect(component).toBeTruthy();
  }));

  it('activeUsersCount counts active users', fakeAsync(() => {
    init();
    component.users = [{ is_active: true }, { is_active: true }, { is_active: false }];
    expect(component.activeUsersCount).toBe(2);
  }));

  it('inactiveUsersCount counts inactive users', fakeAsync(() => {
    init();
    component.users = [{ is_active: true }, { is_active: false }];
    expect(component.inactiveUsersCount).toBe(1);
  }));

  it('adminUsersCount counts users with admin role', fakeAsync(() => {
    init();
    component.users = [{ roles: ['admin'] }, { roles: ['user'] }, { roles: ['admin', 'user'] }];
    expect(component.adminUsersCount).toBe(2);
  }));

  it('filteredUsers returns all when no search term', fakeAsync(() => {
    init();
    component.users = [{ name: 'Alice', email: 'a@a.com', roles: [] }, { name: 'Bob', email: 'b@b.com', roles: [] }];
    component.searchTerm = '';
    expect(component.filteredUsers.length).toBe(2);
  }));

  it('filteredUsers filters by name', fakeAsync(() => {
    init();
    component.users = [
      { name: 'Alice', email: 'a@a.com', roles: [], phone: '' },
      { name: 'Bob', email: 'b@b.com', roles: [], phone: '' }
    ];
    component.searchTerm = 'alice';
    expect(component.filteredUsers.length).toBe(1);
    expect(component.filteredUsers[0].name).toBe('Alice');
  }));

  it('totalPages is at least 1', fakeAsync(() => {
    init();
    component.users = [];
    expect(component.totalPages).toBe(1);
  }));

  it('nextPage() increments page', fakeAsync(() => {
    init();
    component.users = Array.from({ length: 15 }, (_, i) => ({
      name: `User${i}`, email: '', roles: [], phone: '', is_active: true
    }));
    component.page = 1;
    component.nextPage();
    expect(component.page).toBe(2);
  }));

  it('previousPage() decrements page', fakeAsync(() => {
    init();
    component.page = 2;
    component.previousPage();
    expect(component.page).toBe(1);
  }));

  it('previousPage() does not go below 1', fakeAsync(() => {
    init();
    component.page = 1;
    component.previousPage();
    expect(component.page).toBe(1);
  }));

  it('startEdit() sets editingUser', fakeAsync(() => {
    init();
    const user = { name: 'Alice', phone: '123' };
    component.startEdit(user);
    expect(component.editingUser).toBe(user);
    expect(component.editForm.name).toBe('Alice');
  }));

  it('cancelEdit() clears editingUser', fakeAsync(() => {
    init();
    component.editingUser = { name: 'Alice' };
    component.cancelEdit();
    expect(component.editingUser).toBeNull();
  }));

  it('onCreateUser() successful POST', fakeAsync(() => {
    init();
    component.createForm = {
      name: 'Charlie',
      email: 'c@c.com',
      password: 'password',
      roles: 'user'
    };
    component.onCreateUser();
    const req = httpMock.expectOne('http://localhost:5000/users/');
    expect(req.request.method).toBe('POST');
    req.flush({});
    httpMock.expectOne('http://localhost:5000/users/').flush({ items: [] });
    tick();
    expect(component.success).toBe('User created successfully!');
  }));

  it('onEdit() successful PUT', fakeAsync(() => {
    init();
    component.editingUser = { id: 'u1', name: 'Old' };
    component.editForm = { name: 'New', phone: '123' };
    component.onEdit();
    const req = httpMock.expectOne('http://localhost:5000/users/u1');
    expect(req.request.method).toBe('PUT');
    req.flush({});
    httpMock.expectOne('http://localhost:5000/users/').flush({ items: [] });
    tick();
    expect(component.success).toBe('User updated successfully!');
    expect(component.editingUser).toBeNull();
  }));

  it('deleteUser() successful DELETE', fakeAsync(() => {
    init();
    spyOn(window, 'confirm').and.returnValue(true);
    component.deleteUser('u1');
    const req = httpMock.expectOne('http://localhost:5000/users/u1');
    expect(req.request.method).toBe('DELETE');
    req.flush({});
    httpMock.expectOne('http://localhost:5000/users/').flush({ items: [] });
    tick();
    expect(component.success).toBe('User deleted!');
  }));

  it('deleteUser() does nothing if user cancels confirm', fakeAsync(() => {
    init();
    spyOn(window, 'confirm').and.returnValue(false);
    component.deleteUser('u1');
    httpMock.expectNone('http://localhost:5000/users/u1');
    expect(component.success).toBe('');
  }));

  it('filteredUsers filters by email', fakeAsync(() => {
    init();
    component.users = [
      { name: 'Alice', email: 'alice@test.com', roles: [], phone: '' },
      { name: 'Bob', email: 'bob@example.com', roles: [], phone: '' }
    ];
    component.searchTerm = 'example';
    expect(component.filteredUsers.length).toBe(1);
    expect(component.filteredUsers[0].name).toBe('Bob');
  }));

  it('setDetailTab() changes tab and resets page', fakeAsync(() => {
    init();
    component.detailPage = 3;
    component.setDetailTab('accounts');
    expect(component.detailTab).toBe('accounts');
    expect(component.detailPage).toBe(1);
  }));

  it('currentDetailItems returns transactions by default', fakeAsync(() => {
    init();
    component.selectedUser = { transactions: [{ id: '1' }], accounts: [], savings: [], investments: [] };
    component.detailTab = 'transactions';
    expect(component.currentDetailItems.length).toBe(1);
  }));

  it('currentDetailItems returns accounts for accounts tab', fakeAsync(() => {
    init();
    component.selectedUser = { transactions: [], accounts: [{ id: 'a1' }, { id: 'a2' }], savings: [], investments: [] };
    component.detailTab = 'accounts';
    expect(component.currentDetailItems.length).toBe(2);
  }));

  it('nextDetailPage() increments detail page', fakeAsync(() => {
    init();
    component.selectedUser = { transactions: Array.from({ length: 15 }, (_, i) => ({ id: i })), accounts: [], savings: [], investments: [] };
    component.detailTab = 'transactions';
    component.detailPage = 1;
    component.nextDetailPage();
    expect(component.detailPage).toBe(2);
  }));
});