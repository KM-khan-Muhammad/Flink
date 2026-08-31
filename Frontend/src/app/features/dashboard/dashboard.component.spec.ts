import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, EMPTY, Subject } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { ChatService } from '../../core/chat/chat.service';
import { SignalRService } from '../../core/signalr/signalr.service';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let routerSpy: jasmine.Spy;
  let chatServiceSpy: jasmine.SpyObj<ChatService>;
  let signalRServiceSpy: jasmine.SpyObj<SignalRService>;

  beforeEach(async () => {
    routerSpy = jasmine.createSpy('navigate');
    chatServiceSpy = jasmine.createSpyObj('ChatService', ['getChats', 'getMessages', 'sendMessage', 'markAsRead', 'searchUsers', 'startChat', 'getAllUsers', 'sendHeartbeat', 'sendTyping', 'getTypingStatus', 'updateProfile', 'getUserInfo', 'initiateCall', 'acceptCall', 'declineCall', 'endCall', 'getIncomingCall', 'getActiveCall', 'getCallHistory', 'createGroupChat', 'uploadFile']);
    chatServiceSpy.getChats.and.returnValue(of([]));
    chatServiceSpy.getMessages.and.returnValue(of([]));
    chatServiceSpy.sendMessage.and.returnValue(of({} as any));
    chatServiceSpy.markAsRead.and.returnValue(EMPTY);
    chatServiceSpy.searchUsers.and.returnValue(of([]));
    chatServiceSpy.startChat.and.returnValue(of({} as any));
    chatServiceSpy.getAllUsers.and.returnValue(of([]));
    chatServiceSpy.sendHeartbeat.and.returnValue(EMPTY);
    chatServiceSpy.sendTyping.and.returnValue(EMPTY);
    chatServiceSpy.getTypingStatus.and.returnValue(of({ isTyping: false }));
    chatServiceSpy.updateProfile.and.returnValue(of({ success: true, token: 'test' }));
    chatServiceSpy.getUserInfo.and.returnValue(of({} as any));
    chatServiceSpy.initiateCall.and.returnValue(of({} as any));
    chatServiceSpy.acceptCall.and.returnValue(EMPTY);
    chatServiceSpy.declineCall.and.returnValue(EMPTY);
    chatServiceSpy.endCall.and.returnValue(EMPTY);
    chatServiceSpy.getIncomingCall.and.returnValue(of(null));
    chatServiceSpy.getActiveCall.and.returnValue(of(null));
    chatServiceSpy.getCallHistory.and.returnValue(of([]));
    chatServiceSpy.createGroupChat.and.returnValue(of({} as any));
    chatServiceSpy.uploadFile.and.returnValue(of({ success: true, fileUrl: '', fileName: '', contentType: '', fileSize: 0, category: '' }));

    signalRServiceSpy = jasmine.createSpyObj('SignalRService', ['startConnection', 'stopConnection', 'waitForConnection', 'sendOffer', 'sendAnswer', 'sendIceCandidate', 'sendCallSignal', 'joinChat', 'leaveChat', 'sendMarkAsRead', 'sendTyping', 'sendStopTyping'], {
      onOfferReceived: new Subject(),
      onAnswerReceived: new Subject(),
      onIceCandidateReceived: new Subject(),
      onCallSignalReceived: new Subject(),
      onConnectionEstablished: new Subject(),
      onConnectionClosed: new Subject(),
      onMessageReceived: new Subject(),
      onChatUpdated: new Subject(),
      onUserTyping: new Subject(),
      onUserStopTyping: new Subject(),
      onMessagesRead: new Subject(),
      onUserOnlineStatus: new Subject(),
      connectionState: null,
      isConnected: false
    });
    signalRServiceSpy.startConnection.and.returnValue(Promise.resolve());
    signalRServiceSpy.stopConnection.and.returnValue(Promise.resolve());
    signalRServiceSpy.waitForConnection.and.returnValue(Promise.resolve());
    signalRServiceSpy.sendOffer.and.returnValue(Promise.resolve());
    signalRServiceSpy.sendAnswer.and.returnValue(Promise.resolve());
    signalRServiceSpy.sendIceCandidate.and.returnValue(Promise.resolve());
    signalRServiceSpy.sendCallSignal.and.returnValue(Promise.resolve());
    signalRServiceSpy.joinChat.and.returnValue(Promise.resolve());
    signalRServiceSpy.leaveChat.and.returnValue(Promise.resolve());
    signalRServiceSpy.sendMarkAsRead.and.returnValue(Promise.resolve());
    signalRServiceSpy.sendTyping.and.returnValue(Promise.resolve());
    signalRServiceSpy.sendStopTyping.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: Router, useValue: { navigate: routerSpy, events: of(null), createUrlTree: jasmine.createSpy(), serializeUrl: jasmine.createSpy(), url: '/dashboard' } as any },
        { provide: ChatService, useValue: chatServiceSpy },
        { provide: SignalRService, useValue: signalRServiceSpy },
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
    const msg = { id: 1, chatId: 1, senderId: 1, senderName: 'Me', content: 'Hello!', messageType: 'text', isRead: false, isDeleted: false, sentAt: new Date().toISOString() };
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
