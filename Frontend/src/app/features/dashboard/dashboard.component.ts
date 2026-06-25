import { Component, signal, computed, AfterViewChecked, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ChatService, ChatDto, MessageDto, UserDto } from '../../core/chat/chat.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements AfterViewChecked, OnInit, OnDestroy {
  @ViewChild('messagesArea') messagesContainer!: ElementRef;

  activePanel = signal<'chats' | 'status' | 'groups' | 'calls' | 'settings'>('chats');
  searchQuery = signal('');
  selectedChatId = signal<number | null>(null);
  newMessage = signal('');
  showNewChatModal = signal(false);
  userSearchQuery = signal('');
  loading = signal(false);
  loadingUsers = signal(false);
  allUsers = signal<UserDto[]>([]);
  editingName = signal(false);
  editFirstName = signal('');
  editLastName = signal('');
  showUserInfo = signal(false);
  userInfoUser = signal<UserDto | null>(null);
  theme = signal<'system' | 'dark' | 'light'>('system');

  currentUser = signal<UserDto | null>(null);
  chats = signal<ChatDto[]>([]);
  messages = signal<MessageDto[]>([]);
  availableUsers = signal<UserDto[]>([]);

  isOtherUserTyping = signal(false);
  showContextMenu = signal(false);
  contextMenuX = signal(0);
  contextMenuY = signal(0);
  contextMenuMessage = signal<MessageDto | null>(null);
  replyingTo = signal<MessageDto | null>(null);
  editingMessage = signal<MessageDto | null>(null);
  editContent = signal('');
  showDeleted = signal(false);

  filteredChats = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.chats();
    return this.chats().filter(c =>
      c.otherUserName.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q)
    );
  });

  groupChats = computed(() => this.chats().filter(c => c.isGroup));
  selectedChat = computed(() => this.chats().find(c => c.id === this.selectedChatId()) ?? null);
  currentMessages = computed(() => this.messages());
  totalUnread = computed(() => this.chats().reduce((sum, c) => sum + c.unreadCount, 0));

  private refreshInterval: any;
  private msgRefreshInterval: any;
  private heartbeatInterval: any;
  private typingInterval: any;

  constructor(
    private router: Router,
    private chatService: ChatService
  ) {}

  ngOnInit() {
    this.loadCurrentUser();
    this.loadChats();
    this.refreshInterval = setInterval(() => this.loadChats(), 3000);
    this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), 25000);
    this.sendHeartbeat();
    const saved = localStorage.getItem('flink-theme') as 'system' | 'dark' | 'light' | null;
    if (saved) this.theme.set(saved);
    this.applyTheme(this.theme());
  }

  ngOnDestroy() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.msgRefreshInterval) clearInterval(this.msgRefreshInterval);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.typingInterval) clearInterval(this.typingInterval);
  }

  ngAfterViewChecked() { this.scrollToBottom(); }

  loadCurrentUser() {
    const token = localStorage.getItem('token');
    if (!token) { this.router.navigate(['/login']); return; }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      this.currentUser.set({
        id: parseInt(payload.nameid || '0'),
        firstName: payload.given_name || 'User',
        lastName: payload.surname || '',
        email: payload.email || '',
        username: payload.unique_name || '',
        phoneNumber: payload.PhoneNumber || '',
        fullName: `${payload.given_name || 'User'} ${payload.surname || ''}`.trim()
      });
    } catch { this.router.navigate(['/login']); }
  }

  loadChats() {
    this.chatService.getChats().subscribe({
      next: (chats) => this.chats.set(chats),
      error: () => {}
    });
  }

  selectChat(id: number) {
    this.selectedChatId.set(id);
    this.loading.set(true);
    this.replyingTo.set(null);
    this.editingMessage.set(null);
    this.loadMessages(id);
    this.chatService.markAsRead(id).subscribe();
    if (this.msgRefreshInterval) clearInterval(this.msgRefreshInterval);
    this.msgRefreshInterval = setInterval(() => {
      if (this.selectedChatId()) this.loadMessages(this.selectedChatId()!);
    }, 2000);
    if (this.typingInterval) clearInterval(this.typingInterval);
    this.typingInterval = setInterval(() => {
      if (this.selectedChatId()) this.checkTypingStatus(this.selectedChatId()!);
    }, 3000);
  }

  loadMessages(chatId: number) {
    this.chatService.getMessages(chatId).subscribe({
      next: (msgs) => { this.messages.set(msgs); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  checkTypingStatus(chatId: number) {
    this.chatService.getTypingStatus(chatId).subscribe({
      next: (res) => this.isOtherUserTyping.set(res.isTyping),
      error: () => this.isOtherUserTyping.set(false)
    });
  }

  sendHeartbeat() {
    this.chatService.sendHeartbeat().subscribe({ error: () => {} });
  }

  onMessageInput(value: string) {
    this.newMessage.set(value);
    if (this.selectedChatId() && value.length > 0) {
      this.chatService.sendTyping(this.selectedChatId()!).subscribe({ error: () => {} });
    }
  }

  openNewChatModal() {
    this.showNewChatModal.set(true);
    this.userSearchQuery.set('');
    this.loadingUsers.set(true);
    this.chatService.getAllUsers().subscribe({
      next: (users) => {
        this.allUsers.set(users);
        this.availableUsers.set(users);
        this.loadingUsers.set(false);
      },
      error: (err) => {
        console.error('Failed to load users:', err);
        this.loadingUsers.set(false);
      }
    });
  }

  closeNewChatModal() {
    this.showNewChatModal.set(false);
    this.userSearchQuery.set('');
  }

  filterUsers(query: string) {
    this.userSearchQuery.set(query);
    const q = query.toLowerCase().trim();
    if (!q) {
      this.availableUsers.set(this.allUsers());
      return;
    }
    const filtered = this.allUsers().filter(u =>
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      (u.phoneNumber && u.phoneNumber.toLowerCase().includes(q)) ||
      u.fullName.toLowerCase().includes(q)
    );
    this.availableUsers.set(filtered);
  }

  startNewChat(userId: number) {
    this.chatService.startChat(userId).subscribe({
      next: (chat) => {
        this.closeNewChatModal();
        this.loadChats();
        this.selectChat(chat.id);
      },
      error: (err) => {
        console.error('Failed to start chat:', err);
      }
    });
  }

  sendMessage() {
    const text = this.newMessage().trim();
    if (!text || !this.selectedChatId()) return;
    const chatId = this.selectedChatId()!;
    const replyTo = this.replyingTo()?.id;
    this.chatService.sendMessage({ chatId, content: text, replyToMessageId: replyTo }).subscribe({
      next: (msg) => {
        this.messages.update(msgs => [...msgs, msg]);
        this.newMessage.set('');
        this.replyingTo.set(null);
        this.chats.update(list => list.map(c => c.id === chatId ? { ...c, lastMessage: text, lastMessageTime: new Date().toISOString() } : c));
      },
      error: () => {}
    });
  }

  isCurrentUser(senderId: number): boolean {
    return this.currentUser()?.id === senderId;
  }

  formatTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  }

  formatMessageTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatDateSeparator(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((today.getTime() - msgDate.getTime()) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'long' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }

  shouldShowDateSeparator(index: number): boolean {
    const msgs = this.messages();
    if (index === 0) return true;
    const prevDate = new Date(msgs[index - 1].sentAt).toDateString();
    const currDate = new Date(msgs[index].sentAt).toDateString();
    return prevDate !== currDate;
  }

  scrollToBottom() {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  logout() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.msgRefreshInterval) clearInterval(this.msgRefreshInterval);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.typingInterval) clearInterval(this.typingInterval);
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  goBack() {
    this.selectedChatId.set(null);
    if (this.msgRefreshInterval) clearInterval(this.msgRefreshInterval);
    if (this.typingInterval) clearInterval(this.typingInterval);
    this.isOtherUserTyping.set(false);
  }

  startEditName() {
    const user = this.currentUser();
    this.editFirstName.set(user?.firstName || '');
    this.editLastName.set(user?.lastName || '');
    this.editingName.set(true);
  }

  cancelEditName() {
    this.editingName.set(false);
  }

  saveName() {
    const first = this.editFirstName().trim();
    const last = this.editLastName().trim();
    if (!first) return;
    this.chatService.updateProfile(first, last).subscribe({
      next: (res) => {
        if (res.success && res.token) {
          localStorage.setItem('token', res.token);
          this.loadCurrentUser();
        }
        this.editingName.set(false);
      },
      error: (err) => console.error('Failed to update profile:', err)
    });
  }

  openUserInfo(userId: number) {
    this.chatService.getUserInfo(userId).subscribe({
      next: (user) => {
        this.userInfoUser.set(user);
        this.showUserInfo.set(true);
      },
      error: (err) => console.error('Failed to load user info:', err)
    });
  }

  openUserInfoFromHeader() {
    const chat = this.selectedChat();
    if (chat) this.openUserInfo(chat.otherUserId);
  }

  openUserInfoFromChatItem(event: MouseEvent, chat: ChatDto) {
    event.preventDefault();
    this.openUserInfo(chat.otherUserId);
  }

  closeUserInfo() {
    this.showUserInfo.set(false);
    this.userInfoUser.set(null);
  }

  setTheme(mode: 'system' | 'dark' | 'light') {
    this.theme.set(mode);
    localStorage.setItem('flink-theme', mode);
    this.applyTheme(mode);
  }

  private applyTheme(mode: 'system' | 'dark' | 'light') {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    if (mode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      root.classList.add(mode);
    }
  }

  openContextMenu(event: MouseEvent, msg: MessageDto) {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuMessage.set(msg);
    this.contextMenuX.set(event.clientX);
    this.contextMenuY.set(event.clientY);
    this.showContextMenu.set(true);
  }

  closeContextMenu() {
    this.showContextMenu.set(false);
    this.contextMenuMessage.set(null);
  }

  replyToMessage() {
    const msg = this.contextMenuMessage();
    if (msg) {
      this.replyingTo.set(msg);
      this.closeContextMenu();
    }
  }

  copyMessage() {
    const msg = this.contextMenuMessage();
    if (msg) {
      navigator.clipboard.writeText(msg.content).catch(() => {});
      this.closeContextMenu();
    }
  }

  editMessageAction() {
    const msg = this.contextMenuMessage();
    if (msg && this.isCurrentUser(msg.senderId) && !msg.isDeleted) {
      this.editingMessage.set(msg);
      this.editContent.set(msg.content);
      this.closeContextMenu();
    }
  }

  saveEditMessage() {
    const msg = this.editingMessage();
    const content = this.editContent().trim();
    if (!msg || !content) return;
    this.chatService.editMessage({ messageId: msg.id, content }).subscribe({
      next: (updated) => {
        this.messages.update(msgs => msgs.map(m => m.id === updated.id ? updated : m));
        this.editingMessage.set(null);
        this.editContent.set('');
      },
      error: () => {}
    });
  }

  cancelEditMessage() {
    this.editingMessage.set(null);
    this.editContent.set('');
  }

  deleteMessageAction() {
    const msg = this.contextMenuMessage();
    if (msg && this.isCurrentUser(msg.senderId)) {
      this.chatService.deleteMessage(msg.id).subscribe({
        next: () => {
          this.messages.update(msgs => msgs.map(m =>
            m.id === msg.id ? { ...m, isDeleted: true, content: '' } : m
          ));
          this.closeContextMenu();
        },
        error: () => {}
      });
    }
  }

  cancelReply() {
    this.replyingTo.set(null);
  }

  onOverlayClick(event: MouseEvent) {
    this.closeContextMenu();
  }
}
