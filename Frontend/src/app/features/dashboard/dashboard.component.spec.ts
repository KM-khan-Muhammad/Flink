import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, EMPTY } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { ChatService } from '../../core/chat/chat.service';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let routerSpy: jasmine.Spy;
  let chatServiceSpy: jasmine.SpyObj<ChatService>;

  beforeEach(async () => {
    routerSpy = jasmine.createSpy('navigate');
    chatServiceSpy = jasmine.createSpyObj('ChatService', ['getChats', 'getMessages', 'sendMessage', 'markAsRead', 'searchUsers', 'startChat', 'getAllUsers']);
    chatServiceSpy.getChats.and.returnValue(of([]));
    chatServiceSpy.getMessages.and.returnValue(of([]));
    chatServiceSpy.sendMessage.and.returnValue(of({} as any));
    chatServiceSpy.markAsRead.and.returnValue(EMPTY);
    chatServiceSpy.searchUsers.and.returnValue(of([]));
    chatServiceSpy.startChat.and.returnValue(of({} as any));
    chatServiceSpy.getAllUsers.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: Router, useValue: { navigate: routerSpy, events: of(null), createUrlTree: jasmine.createSpy(), serializeUrl: jasmine.createSpy(), url: '/dashboard' } as any },
        { provide: ChatService, useValue: chatServiceSpy },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    localStorage.clear();
    fixture.detectChanges();
  });

  afterEach(() => { localStorage.clear(); });

  it('should create', () => { expect(component).toBeTruthy(); });

  it('should start on chats panel', () => { expect(component.activePanel()).toBe('chats'); });

  it('should switch panels', () => {
    component.activePanel.set('status');
    expect(component.activePanel()).toBe('status');
    component.activePanel.set('groups');
    expect(component.activePanel()).toBe('groups');
    component.activePanel.set('calls');
    expect(component.activePanel()).toBe('calls');
    component.activePanel.set('settings');
    expect(component.activePanel()).toBe('settings');
  });

  it('should filter chats', () => {
    component.chats.set([
      { id: 1, name: '', isGroup: false, otherUserId: 2, otherUserName: 'Aisha Khan', otherUserEmail: 'a@test.com', lastMessage: 'Hello', lastMessageTime: '', unreadCount: 2 },
      { id: 2, name: '', isGroup: false, otherUserId: 3, otherUserName: 'Ravi Sharma', otherUserEmail: 'r@test.com', lastMessage: 'Hi', lastMessageTime: '', unreadCount: 0 },
    ]);
    component.searchQuery.set('aisha');
    expect(component.filteredChats().length).toBe(1);
    expect(component.filteredChats()[0].otherUserName).toBe('Aisha Khan');
  });

  it('should select chat and load messages', () => {
    component.selectChat(1);
    expect(component.selectedChatId()).toBe(1);
    expect(chatServiceSpy.getMessages).toHaveBeenCalledWith(1);
  });

  it('should send message', () => {
    const msg = { id: 1, chatId: 1, senderId: 1, senderName: 'Me', content: 'Hello!', messageType: 'text', isRead: false, sentAt: new Date().toISOString() };
    chatServiceSpy.sendMessage.and.returnValue(of(msg));
    component.selectedChatId.set(1);
    component.newMessage.set('Hello!');
    component.sendMessage();
    expect(chatServiceSpy.sendMessage).toHaveBeenCalled();
    expect(component.messages().length).toBe(1);
  });

  it('should not send empty message', () => {
    component.selectedChatId.set(1);
    component.newMessage.set('   ');
    component.sendMessage();
    expect(chatServiceSpy.sendMessage).not.toHaveBeenCalled();
  });

  it('should get initials', () => {
    expect(component.getInitials('Aisha Khan')).toBe('AK');
    expect(component.getInitials('Ravi Sharma')).toBe('RS');
  });

  it('should logout and clear token', () => {
    localStorage.setItem('token', 'test');
    component.logout();
    expect(localStorage.getItem('token')).toBeNull();
    expect(routerSpy).toHaveBeenCalledWith(['/login']);
  });

  it('should goBack deselect chat', () => {
    component.selectedChatId.set(1);
    component.goBack();
    expect(component.selectedChatId()).toBeNull();
  });

  it('should have totalUnread count', () => {
    component.chats.set([
      { id: 1, otherUserName: 'A', otherUserId: 1, isGroup: false, lastMessage: '', lastMessageTime: '', unreadCount: 3 },
    ]);
    expect(component.totalUnread()).toBe(3);
  });

  it('should open new chat modal and load users', () => {
    const users = [{ id: 1, firstName: 'Test', lastName: 'User', email: 't@test.com', username: 'test', phoneNumber: '09123456789', fullName: 'Test User' }];
    chatServiceSpy.getAllUsers.and.returnValue(of(users));
    component.openNewChatModal();
    expect(component.showNewChatModal()).toBeTrue();
    expect(chatServiceSpy.getAllUsers).toHaveBeenCalled();
    expect(component.availableUsers().length).toBe(1);
  });

  it('should close new chat modal', () => {
    component.showNewChatModal.set(true);
    component.closeNewChatModal();
    expect(component.showNewChatModal()).toBeFalse();
  });

  it('should filter users by name', () => {
    const users = [
      { id: 1, firstName: 'Test', lastName: 'User', email: 't@test.com', username: 'test', phoneNumber: '09123456789', fullName: 'Test User' },
      { id: 2, firstName: 'Ali', lastName: 'Khan', email: 'a@test.com', username: 'ali', phoneNumber: '09987654321', fullName: 'Ali Khan' },
    ];
    component.allUsers.set(users);
    component.filterUsers('ali');
    expect(component.availableUsers().length).toBe(1);
    expect(component.availableUsers()[0].firstName).toBe('Ali');
  });

  it('should filter users by phone', () => {
    const users = [
      { id: 1, firstName: 'Test', lastName: 'User', email: 't@test.com', username: 'test', phoneNumber: '09123456789', fullName: 'Test User' },
    ];
    component.allUsers.set(users);
    component.filterUsers('09123');
    expect(component.availableUsers().length).toBe(1);
  });
});
